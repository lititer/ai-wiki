from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Page schemas
class PageCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(default="")
    tags: list[str] = Field(default=[])


class PageUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None


class PageResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    summary: Optional[str] = None
    tags: list[str] = []
    status: str = "published"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageListResponse(BaseModel):
    pages: list[PageResponse]
    total: int


# AI schemas
class QARequest(BaseModel):
    question: str = Field(..., min_length=1)
    max_results: int = Field(default=5, ge=1, le=20)


class QAResponse(BaseModel):
    answer: str
    sources: list[dict] = []
    confidence: float = 0.0


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=10, ge=1, le=50)
    search_type: str = Field(default="hybrid")  # "semantic", "keyword", "hybrid"


class SearchResult(BaseModel):
    page_id: int
    title: str
    slug: str
    snippet: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int


class CompileRequest(BaseModel):
    content: str = Field(..., min_length=1)
    title: Optional[str] = None
    extract_concepts: bool = True
    generate_summary: bool = True
    find_references: bool = True


class ConceptInfo(BaseModel):
    name: str
    description: str
    related_pages: list[int] = []


class CompileResponse(BaseModel):
    summary: str
    concepts: list[ConceptInfo] = []
    cross_references: list[dict] = []
    tags: list[str] = []


class SummarizeRequest(BaseModel):
    content: str = Field(..., min_length=50)


class WritingAssistRequest(BaseModel):
    content: str = Field(..., min_length=1)
    task: str = Field(...)  # "polish", "continue", "fix", "outline", "summarize"
    context: Optional[str] = None


class WritingAssistResponse(BaseModel):
    result: str
    suggestions: list[str] = []
