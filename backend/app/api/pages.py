"""Pages API - CRUD operations for wiki pages."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
import re

from app.core.database import get_db
from app.models.page import Page, Embedding, Concept, CrossReference
from app.schemas.page import (
    PageCreate,
    PageUpdate,
    PageResponse,
    PageListResponse,
)
from app.services.ai_service import (
    generate_embedding,
    generate_summary,
    generate_tags,
    chunk_text,
)

router = APIRouter()


def create_slug(title: str) -> str:
    """Create URL-friendly slug from title."""
    slug = title.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug[:500]


@router.get("/", response_model=PageListResponse)
async def list_pages(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get list of pages with optional filtering."""
    query = select(Page)

    # Filter by status
    if status:
        query = query.where(Page.status == status)

    # Filter by tag
    if tag:
        query = query.where(Page.tags.contains([tag]))

    # Search in title and content
    if search:
        search_filter = or_(
            Page.title.ilike(f"%{search}%"),
            Page.content.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(Page.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    pages = result.scalars().all()

    return PageListResponse(pages=pages, total=total)


@router.get("/{slug}", response_model=PageResponse)
async def get_page(slug: str, db: AsyncSession = Depends(get_db)):
    """Get a single page by slug."""
    query = select(Page).where(Page.slug == slug)
    result = await db.execute(query)
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    return page


@router.post("/", response_model=PageResponse, status_code=201)
async def create_page(page_data: PageCreate, db: AsyncSession = Depends(get_db)):
    """Create a new page."""
    # Create slug from title
    slug = create_slug(page_data.title)

    # Check if slug already exists
    existing = await db.execute(select(Page).where(Page.slug == slug))
    if existing.scalar_one_or_none():
        # Add number suffix to make slug unique
        counter = 1
        while True:
            new_slug = f"{slug}-{counter}"
            check = await db.execute(select(Page).where(Page.slug == new_slug))
            if not check.scalar_one_or_none():
                slug = new_slug
                break
            counter += 1

    # Generate summary if content exists
    summary = None
    if page_data.content and len(page_data.content) > 100:
        try:
            summary = await generate_summary(page_data.content)
        except Exception:
            summary = page_data.content[:200] + "..."

    # Create page object
    page = Page(
        title=page_data.title,
        slug=slug,
        content=page_data.content,
        summary=summary,
        tags=page_data.tags,
        status="published",
    )

    db.add(page)
    await db.commit()
    await db.refresh(page)

    # Generate embeddings in background (non-blocking)
    if page_data.content:
        try:
            chunks = chunk_text(page_data.content)
            for i, chunk in enumerate(chunks):
                embedding_vector = generate_embedding(chunk)
                embedding = Embedding(
                    page_id=page.id,
                    chunk_text=chunk,
                    chunk_index=i,
                    embedding=embedding_vector,
                )
                db.add(embedding)
            await db.commit()
        except Exception as e:
            # Log error but don't fail page creation
            print(f"Warning: Failed to generate embeddings: {e}")

    return page


@router.put("/{slug}", response_model=PageResponse)
async def update_page(
    slug: str,
    page_data: PageUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing page."""
    query = select(Page).where(Page.slug == slug)
    result = await db.execute(query)
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Update fields if provided
    if page_data.title is not None:
        page.title = page_data.title
        # Update slug if title changed
        new_slug = create_slug(page_data.title)
        if new_slug != slug:
            # Check if new slug exists
            existing = await db.execute(
                select(Page).where(Page.slug == new_slug)
            )
            if not existing.scalar_one_or_none():
                page.slug = new_slug

    if page_data.content is not None:
        page.content = page_data.content

        # Regenerate summary
        if len(page_data.content) > 100:
            try:
                page.summary = await generate_summary(page_data.content)
            except Exception:
                page.summary = page_data.content[:200] + "..."

        # Regenerate embeddings
        try:
            # Delete old embeddings
            old_embeddings = await db.execute(
                select(Embedding).where(Embedding.page_id == page.id)
            )
            for emb in old_embeddings.scalars().all():
                await db.delete(emb)

            # Create new embeddings
            chunks = chunk_text(page_data.content)
            for i, chunk in enumerate(chunks):
                embedding_vector = generate_embedding(chunk)
                embedding = Embedding(
                    page_id=page.id,
                    chunk_text=chunk,
                    chunk_index=i,
                    embedding=embedding_vector,
                )
                db.add(embedding)
        except Exception as e:
            print(f"Warning: Failed to update embeddings: {e}")

    if page_data.tags is not None:
        page.tags = page_data.tags

    if page_data.status is not None:
        page.status = page_data.status

    await db.commit()
    await db.refresh(page)

    return page


@router.delete("/{slug}", status_code=204)
async def delete_page(slug: str, db: AsyncSession = Depends(get_db)):
    """Delete a page."""
    query = select(Page).where(Page.slug == slug)
    result = await db.execute(query)
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Delete related embeddings
    embeddings = await db.execute(
        select(Embedding).where(Embedding.page_id == page.id)
    )
    for emb in embeddings.scalars().all():
        await db.delete(emb)

    # Delete related cross-references
    refs = await db.execute(
        select(CrossReference).where(
            or_(
                CrossReference.source_page_id == page.id,
                CrossReference.target_page_id == page.id,
            )
        )
    )
    for ref in refs.scalars().all():
        await db.delete(ref)

    # Delete the page
    await db.delete(page)
    await db.commit()

    return None


@router.get("/{slug}/related", response_model=list[PageResponse])
async def get_related_pages(
    slug: str,
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Get pages related to the given page."""
    # Get the source page
    query = select(Page).where(Page.slug == slug)
    result = await db.execute(query)
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Find related pages through cross-references
    refs_query = select(CrossReference).where(
        or_(
            CrossReference.source_page_id == page.id,
            CrossReference.target_page_id == page.id,
        )
    )
    refs_result = await db.execute(refs_query)
    refs = refs_result.scalars().all()

    # Collect related page IDs
    related_ids = set()
    for ref in refs:
        if ref.source_page_id == page.id:
            related_ids.add(ref.target_page_id)
        else:
            related_ids.add(ref.source_page_id)

    if not related_ids:
        # Fallback: find pages with similar tags
        if page.tags:
            similar_query = (
                select(Page)
                .where(Page.id != page.id)
                .where(Page.tags.overlap(page.tags))
                .limit(limit)
            )
            similar_result = await db.execute(similar_query)
            return similar_result.scalars().all()
        return []

    # Get related pages
    related_query = (
        select(Page).where(Page.id.in_(related_ids)).limit(limit)
    )
    related_result = await db.execute(related_query)
    return related_result.scalars().all()
