from app.api.pages import create_slug


def test_create_slug_normalizes_ascii_title():
    assert create_slug("FastAPI + Next.js Guide") == "fastapi-nextjs-guide"


def test_create_slug_collapses_whitespace_and_dashes():
    assert create_slug("  AI   Wiki___Local---Deploy  ") == "ai-wiki-local-deploy"


def test_create_slug_keeps_unicode_word_characters():
    assert create_slug("Phase 3 引用验证页面") == "phase-3-引用验证页面"
