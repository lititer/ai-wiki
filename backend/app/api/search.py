"""Search API - Semantic and keyword search for wiki pages."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional

from app.core.database import get_db
from app.models.page import Page, Embedding
from app.schemas.page import SearchRequest, SearchResponse, SearchResult
from app.services.ai_service import generate_embedding, cosine_similarity

router = APIRouter()


@router.post("/", response_model=SearchResponse)
async def search_pages(
    request: SearchRequest, db: AsyncSession = Depends(get_db)
):
    """Search pages using semantic, keyword, or hybrid search."""
    results = []

    if request.search_type == "semantic":
        results = await semantic_search(db, request.query, request.limit)
    elif request.search_type == "keyword":
        results = await keyword_search(db, request.query, request.limit)
    else:  # hybrid
        semantic_results = await semantic_search(db, request.query, request.limit)
        keyword_results = await keyword_search(db, request.query, request.limit)

        # Merge results, prioritizing semantic matches
        seen_ids = set()
        for result in semantic_results:
            if result.page_id not in seen_ids:
                results.append(result)
                seen_ids.add(result.page_id)

        for result in keyword_results:
            if result.page_id not in seen_ids:
                results.append(result)
                seen_ids.add(result.page_id)

        # Sort by score and limit
        results.sort(key=lambda x: x.score, reverse=True)
        results = results[: request.limit]

    return SearchResponse(results=results, total=len(results))


async def semantic_search(
    db: AsyncSession, query: str, limit: int
) -> list[SearchResult]:
    """Search using vector embeddings."""
    # Generate embedding for query
    query_embedding = generate_embedding(query)

    # Get all embeddings
    embeddings_query = select(Embedding)
    embeddings_result = await db.execute(embeddings_query)
    all_embeddings = embeddings_result.scalars().all()

    if not all_embeddings:
        return []

    # Calculate similarities
    page_scores: dict[int, list[float]] = {}
    page_chunks: dict[int, str] = {}

    for emb in all_embeddings:
        similarity = cosine_similarity(query_embedding, emb.embedding)

        if emb.page_id not in page_scores:
            page_scores[emb.page_id] = []
            page_chunks[emb.page_id] = emb.chunk_text
        page_scores[emb.page_id].append(similarity)

    # Average scores per page
    page_avg_scores = {}
    for page_id, scores in page_scores.items():
        page_avg_scores[page_id] = sum(scores) / len(scores)

    # Sort by score and get top pages
    sorted_pages = sorted(
        page_avg_scores.items(), key=lambda x: x[1], reverse=True
    )[:limit]

    # Get page details
    results = []
    for page_id, score in sorted_pages:
        page_query = select(Page).where(Page.id == page_id)
        page_result = await db.execute(page_query)
        page = page_result.scalar_one_or_none()

        if page:
            # Create snippet from chunk
            snippet = page_chunks.get(page_id, "")
            if len(snippet) > 200:
                snippet = snippet[:200] + "..."

            results.append(
                SearchResult(
                    page_id=page.id,
                    title=page.title,
                    slug=page.slug,
                    snippet=snippet,
                    score=round(score, 3),
                )
            )

    return results


async def keyword_search(
    db: AsyncSession, query: str, limit: int
) -> list[SearchResult]:
    """Search using full-text search."""
    # Search in title and content
    search_filter = or_(
        Page.title.ilike(f"%{query}%"),
        Page.content.ilike(f"%{query}%"),
        Page.summary.ilike(f"%{query}%"),
    )

    pages_query = (
        select(Page).where(search_filter).limit(limit)
    )
    pages_result = await db.execute(pages_query)
    pages = pages_result.scalars().all()

    results = []
    for page in pages:
        # Calculate a simple relevance score
        title_match = query.lower() in page.title.lower()
        content_match = query.lower() in (page.content or "").lower()

        if title_match:
            score = 0.9
        elif content_match:
            score = 0.7
        else:
            score = 0.5

        # Create snippet with highlighted match
        snippet = ""
        if page.summary:
            snippet = page.summary[:200]
        elif page.content:
            # Find the query in content and extract surrounding text
            content_lower = page.content.lower()
            query_lower = query.lower()
            pos = content_lower.find(query_lower)

            if pos >= 0:
                start = max(0, pos - 50)
                end = min(len(page.content), pos + len(query) + 150)
                snippet = page.content[start:end]
                if start > 0:
                    snippet = "..." + snippet
                if end < len(page.content):
                    snippet = snippet + "..."
            else:
                snippet = page.content[:200] + "..."

        results.append(
            SearchResult(
                page_id=page.id,
                title=page.title,
                slug=page.slug,
                snippet=snippet,
                score=round(score, 3),
            )
        )

    return results


@router.get("/suggest")
async def search_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    """Get search suggestions based on partial query."""
    # Search in titles
    pages_query = (
        select(Page)
        .where(Page.title.ilike(f"%{q}%"))
        .limit(limit)
    )
    pages_result = await db.execute(pages_query)
    pages = pages_result.scalars().all()

    suggestions = [page.title for page in pages]

    # Also search in tags. Keep filtering in Python because tags are stored as
    # a PostgreSQL ARRAY and SQLAlchemy's any() expects a scalar value here.
    if len(suggestions) < limit:
        tags_query = select(Page.tags)
        tags_result = await db.execute(tags_query)
        all_tags = tags_result.scalars().all()

        query_lower = q.lower()
        for tag_list in all_tags:
            for tag in tag_list or []:
                if query_lower in tag.lower() and tag not in suggestions:
                    suggestions.append(tag)
                    if len(suggestions) >= limit:
                        break
            if len(suggestions) >= limit:
                break

    return {"suggestions": suggestions[:limit]}


@router.get("/tags")
async def get_popular_tags(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get popular tags across all pages."""
    # This is a simplified version - in production, you'd want to aggregate properly
    pages_query = select(Page.tags)
    pages_result = await db.execute(pages_query)
    all_tags = pages_result.scalars().all()

    # Count tag occurrences
    tag_counts: dict[str, int] = {}
    for tags in all_tags:
        if tags:
            for tag in tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    # Sort by count and return top tags
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    popular_tags = [{"tag": tag, "count": count} for tag, count in sorted_tags[:limit]]

    return {"tags": popular_tags}
