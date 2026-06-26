import pytest
from pydantic import ValidationError

from app.schemas.page import QARequest, SummarizeRequest


def test_qa_request_defaults_max_results():
    request = QARequest(question="What is AI Wiki?")
    assert request.max_results == 5


def test_qa_request_rejects_empty_question():
    with pytest.raises(ValidationError):
        QARequest(question="")


def test_summarize_request_accepts_long_content():
    request = SummarizeRequest(content="x" * 50)
    assert len(request.content) == 50


def test_summarize_request_rejects_short_content():
    with pytest.raises(ValidationError):
        SummarizeRequest(content="too short")
