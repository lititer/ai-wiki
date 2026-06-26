from sqlalchemy import Column, Integer, String, Text, DateTime, ARRAY, JSON
from sqlalchemy.sql import func

from app.core.database import Base


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False, default="")
    summary = Column(Text)
    tags = Column(ARRAY(String), default=[])
    status = Column(String(20), default="published")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    page_id = Column(Integer, nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), unique=True, nullable=False)
    description = Column(Text)
    page_ids = Column(ARRAY(Integer), default=[])
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CrossReference(Base):
    __tablename__ = "cross_references"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_page_id = Column(Integer, nullable=False, index=True)
    target_page_id = Column(Integer, nullable=False, index=True)
    relationship = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())


class QAHistory(Base):
    __tablename__ = "qa_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_page_ids = Column(ARRAY(Integer), default=[])
    created_at = Column(DateTime, server_default=func.now())
