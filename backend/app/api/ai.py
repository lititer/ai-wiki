"""AI API - AI-powered features for the wiki."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import numpy as np

from app.core.database import get_db
from app.models.page import Page, Embedding, Concept, CrossReference, QAHistory
from app.schemas.page import (
    QARequest,
    QAResponse,
    CompileRequest,
    CompileResponse,
    ConceptInfo,
    SummarizeRequest,
    WritingAssistRequest,
    WritingAssistResponse,
)
from app.services.ai_service import (
    answer_question,
    generate_embedding,
    generate_summary,
    extract_concepts,
    generate_tags,
    find_cross_references,
    writing_assistant,
    cosine_similarity,
    chunk_text,
)

router = APIRouter()


@router.post("/ask", response_model=QAResponse)
async def ask_question(request: QARequest, db: AsyncSession = Depends(get_db)):
    """Answer a question using RAG (Retrieval-Augmented Generation)."""
    # Generate embedding for the question
    question_embedding = generate_embedding(request.question)

    # Get all embeddings from database
    embeddings_query = select(Embedding)
    embeddings_result = await db.execute(embeddings_query)
    all_embeddings = embeddings_result.scalars().all()

    if not all_embeddings:
        return QAResponse(
            answer="I don't have any wiki content to search through yet. Please add some pages first.",
            sources=[],
            confidence=0.0,
        )

    # Calculate similarities and find top chunks
    similarities = []
    for emb in all_embeddings:
        similarity = cosine_similarity(question_embedding, emb.embedding)
        similarities.append((emb, similarity))

    # Sort by similarity and get top results
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_chunks = similarities[: request.max_results]

    # Get page information for each chunk
    context_chunks = []
    source_pages = []
    for emb, score in top_chunks:
        page_query = select(Page).where(Page.id == emb.page_id)
        page_result = await db.execute(page_query)
        page = page_result.scalar_one_or_none()

        if page:
            context_chunks.append(
                {
                    "page_id": page.id,
                    "title": page.title,
                    "slug": page.slug,
                    "text": emb.chunk_text,
                    "score": score,
                }
            )
            if page.id not in [s["page_id"] for s in source_pages]:
                source_pages.append({"page_id": page.id, "title": page.title, "slug": page.slug})

    # Generate answer using LLM
    qa_result = await answer_question(request.question, context_chunks)

    # Calculate average confidence
    avg_confidence = (
        sum(score for _, score in top_chunks) / len(top_chunks) if top_chunks else 0.0
    )

    # Save to QA history
    qa_history = QAHistory(
        question=request.question,
        answer=qa_result["answer"],
        source_page_ids=[s["page_id"] for s in source_pages],
    )
    db.add(qa_history)
    await db.commit()

    return QAResponse(
        answer=qa_result["answer"],
        sources=source_pages,
        confidence=round(avg_confidence, 3),
    )


@router.post("/compile", response_model=CompileResponse)
async def compile_knowledge(
    request: CompileRequest, db: AsyncSession = Depends(get_db)
):
    """Compile knowledge from content - extract concepts, generate summary, find references.

    LLM-backed steps (summary, concepts, tags, cross-references) run concurrently.
    Each step degrades gracefully on failure so a single provider error does not
    break the whole compilation.
    """
    # Fetch existing pages up front; cross-reference discovery needs them as input.
    pages: list[Page] = []
    page_lookup: dict[int, Page] = {}
    if request.find_references:
        pages_result = await db.execute(select(Page).limit(100))
        pages = pages_result.scalars().all()
        page_lookup = {p.id: p for p in pages}
    existing_pages = [
        {"id": p.id, "title": p.title, "slug": p.slug} for p in pages
    ]

    async def safe_summary() -> str:
        if not request.generate_summary:
            return ""
        try:
            return await generate_summary(request.content)
        except Exception:
            return ""

    async def safe_concepts() -> list[dict]:
        if not request.extract_concepts:
            return []
        try:
            return await extract_concepts(request.content)
        except Exception:
            return []

    async def safe_tags() -> list[str]:
        try:
            return await generate_tags(request.content)
        except Exception:
            return []

    async def safe_refs() -> list[dict]:
        if not request.find_references or not existing_pages:
            return []
        try:
            return await find_cross_references(request.content, existing_pages)
        except Exception:
            return []

    summary_text, concepts_data, tags, refs_data = await asyncio.gather(
        safe_summary(), safe_concepts(), safe_tags(), safe_refs()
    )

    results: dict = {
        "summary": summary_text,
        "concepts": [
            ConceptInfo(name=c["name"], description=c["description"])
            for c in concepts_data
        ],
        "tags": tags,
    }

    # Persist concepts (sequential DB writes after LLM results are in).
    for concept_data in concepts_data:
        existing = await db.execute(
            select(Concept).where(Concept.name == concept_data["name"])
        )
        concept = existing.scalar_one_or_none()

        if concept:
            if len(concept_data["description"]) > len(concept.description or ""):
                concept.description = concept_data["description"]
        else:
            db.add(
                Concept(
                    name=concept_data["name"],
                    description=concept_data["description"],
                )
            )

    # Enrich cross-references with slug/title and persist if we have a page.
    enriched_refs = []
    for ref in refs_data:
        try:
            page_id = int(ref.get("page_id"))
        except (TypeError, ValueError):
            continue
        page_ref = page_lookup.get(page_id)
        if not page_ref:
            continue
        enriched_refs.append(
            {
                "page_id": page_ref.id,
                "title": page_ref.title,
                "slug": page_ref.slug,
                "relationship": ref.get("relationship", "related"),
            }
        )
    results["cross_references"] = enriched_refs

    if request.title:
        page_query = select(Page).where(Page.title == request.title)
        page_result = await db.execute(page_query)
        page = page_result.scalar_one_or_none()

        if page:
            for ref in enriched_refs:
                db.add(
                    CrossReference(
                        source_page_id=page.id,
                        target_page_id=ref["page_id"],
                        relationship=ref.get("relationship", "related"),
                    )
                )

    await db.commit()

    return CompileResponse(
        summary=results["summary"],
        concepts=results["concepts"],
        cross_references=results["cross_references"],
        tags=results["tags"],
    )


@router.post("/write", response_model=WritingAssistResponse)
async def writing_assist(
    request: WritingAssistRequest, db: AsyncSession = Depends(get_db)
):
    """AI writing assistant for wiki pages."""
    result = await writing_assistant(
        content=request.content,
        task=request.task,
        context=request.context or "",
    )

    suggestions = []

    # Generate additional suggestions based on task
    if request.task == "polish":
        suggestions.append("Consider adding more specific examples")
        suggestions.append("Check for technical accuracy")
    elif request.task == "continue":
        suggestions.append("Add a conclusion section")
        suggestions.append("Include relevant links to related pages")
    elif request.task == "outline":
        suggestions.append("Expand each section with detailed content")
        suggestions.append("Add code examples where appropriate")

    return WritingAssistResponse(result=result["result"], suggestions=suggestions)


@router.post("/summarize")
async def summarize_content(
    request: SummarizeRequest, db: AsyncSession = Depends(get_db)
):
    """Generate a summary for given content."""
    summary = await generate_summary(request.content)
    return {"summary": summary}


@router.post("/embeddings/generate/{page_id}")
async def generate_page_embeddings(
    page_id: int, db: AsyncSession = Depends(get_db)
):
    """Generate or regenerate embeddings for a page."""
    # Get the page
    page_query = select(Page).where(Page.id == page_id)
    page_result = await db.execute(page_query)
    page = page_result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Delete existing embeddings
    old_embeddings = await db.execute(
        select(Embedding).where(Embedding.page_id == page_id)
    )
    for emb in old_embeddings.scalars().all():
        await db.delete(emb)

    # Generate new embeddings
    if page.content:
        chunks = chunk_text(page.content)
        for i, chunk in enumerate(chunks):
            embedding_vector = generate_embedding(chunk)
            embedding = Embedding(
                page_id=page_id,
                chunk_text=chunk,
                chunk_index=i,
                embedding=embedding_vector,
            )
            db.add(embedding)

    await db.commit()

    return {
        "message": f"Generated {len(chunks) if page.content else 0} embeddings",
        "page_id": page_id,
    }
