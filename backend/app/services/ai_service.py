"""AI Service - Core AI logic for the wiki system."""

import httpx
import json
from typing import Optional
import numpy as np

from app.core.config import get_settings

settings = get_settings()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into chunks for embedding."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def generate_embedding(text: str) -> Optional[list[float]]:
    """Generate embedding vector for text.

    Since Xiaomi API doesn't support embeddings, we use a simple hash-based approach
    for testing. In production, use a proper embedding model.
    """
    # Simple hash-based embedding for testing (not for production)
    import hashlib
    hash_obj = hashlib.sha256(text.encode())
    hash_bytes = hash_obj.digest()
    # Convert to float array (32 bytes -> 32 floats)
    embedding = [float(b) / 255.0 for b in hash_bytes]
    return embedding


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a_np = np.array(a)
    b_np = np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))


async def call_llm(prompt: str, system_prompt: str = "") -> str:
    """Call the LLM API (Xiaomi MiMo)."""
    headers = {
        "Content-Type": "application/json",
        "x-api-key": settings.llm_api_key,
        "anthropic-version": "2023-06-01",
    }

    messages = [{"role": "user", "content": prompt}]

    body = {
        "model": settings.llm_model,
        "max_tokens": 4096,
        "messages": messages,
    }

    if system_prompt:
        body["system"] = system_prompt

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.llm_api_base}/v1/messages",
            headers=headers,
            json=body,
        )
        response.raise_for_status()
        result = response.json()

        # Extract text from response
        content = result.get("content", [])
        for item in content:
            if item.get("type") == "text":
                return item["text"]

        return str(content)


async def answer_question(question: str, context_chunks: list[dict]) -> dict:
    """Answer a question based on context chunks."""
    context_text = "\n\n".join(
        [
            f"[Source: {chunk['title']}]\n{chunk['text']}"
            for chunk in context_chunks
        ]
    )

    system_prompt = """You are a helpful AI wiki assistant. Answer questions based on the provided context.
If the answer cannot be found in the context, say so honestly.
Always cite your sources by mentioning the page title.
Be concise and accurate."""

    prompt = f"""Context from wiki pages:
{context_text}

Question: {question}

Please provide a clear, accurate answer based on the context above. If you reference specific information, mention which page it came from."""

    answer = await call_llm(prompt, system_prompt)

    return {
        "answer": answer,
        "sources": [
            {"page_id": c["page_id"], "title": c["title"], "slug": c.get("slug", "")}
            for c in context_chunks
        ],
    }


async def generate_summary(content: str) -> str:
    """Generate a summary for wiki page content."""
    system_prompt = "You are a technical writer. Create concise, informative summaries."
    prompt = f"""Summarize the following wiki page content in 2-3 sentences:

{content}

Summary:"""
    return await call_llm(prompt, system_prompt)


async def extract_concepts(content: str) -> list[dict]:
    """Extract key concepts from content."""
    system_prompt = """You are a knowledge extraction expert. Extract key concepts from the given text.
Return a JSON array of objects with 'name' and 'description' fields.
Only return the JSON array, no other text."""

    prompt = f"""Extract the key concepts from this text:

{content}

Return format: [{{"name": "concept name", "description": "brief description"}}]"""

    result = await call_llm(prompt, system_prompt)

    try:
        # Try to parse JSON from the response
        json_start = result.find("[")
        json_end = result.rfind("]") + 1
        if json_start >= 0 and json_end > json_start:
            return json.loads(result[json_start:json_end])
    except json.JSONDecodeError:
        pass

    return []


async def generate_tags(content: str) -> list[str]:
    """Generate tags for wiki content."""
    system_prompt = "You are a content tagging expert. Generate relevant tags."
    prompt = f"""Generate 3-5 relevant tags for this wiki content. Return only the tags as a comma-separated list.

{content}

Tags:"""
    result = await call_llm(prompt, system_prompt)
    return [tag.strip() for tag in result.split(",") if tag.strip()]


async def find_cross_references(
    content: str, existing_pages: list[dict]
) -> list[dict]:
    """Find potential cross-references to existing pages."""
    if not existing_pages:
        return []

    pages_list = "\n".join(
        [
            f"- {p['title']} (id: {p['id']}, slug: {p.get('slug', '')})"
            for p in existing_pages
        ]
    )

    system_prompt = """You are a knowledge linking expert. Identify which existing pages are related to the given content.
Return a JSON array of objects with 'page_id' and 'relationship' fields.
Only return the JSON array, no other text."""

    prompt = f"""Given this content:
{content[:1000]}...

Which of these existing pages are related?
{pages_list}

Return format: [{{"page_id": 1, "relationship": "related topic"}}]"""

    result = await call_llm(prompt, system_prompt)

    try:
        json_start = result.find("[")
        json_end = result.rfind("]") + 1
        if json_start >= 0 and json_end > json_start:
            return json.loads(result[json_start:json_end])
    except json.JSONDecodeError:
        pass

    return []


async def writing_assistant(content: str, task: str, context: str = "") -> dict:
    """AI writing assistant for wiki pages."""
    task_prompts = {
        "polish": "Polish and improve the following text while maintaining its meaning. Make it clearer and more professional.",
        "continue": "Continue writing from where the text left off. Maintain the same style and tone.",
        "fix": "Fix any grammar, spelling, or style issues in the following text.",
        "outline": "Create a detailed outline for a wiki page about the following topic.",
        "summarize": "Summarize the following text in a concise way.",
        "expand": "Expand the following text with more details and examples.",
    }

    system_prompt = "You are a skilled technical writer and editor for a wiki system."

    task_prompt = task_prompts.get(task, task_prompts["polish"])

    prompt = f"""{task_prompt}

{f'Context: {context}' if context else ''}

Content:
{content}

Result:"""

    result = await call_llm(prompt, system_prompt)

    return {"result": result, "task": task}
