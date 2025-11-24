from pydantic import BaseModel
from typing import List, Optional


class ConfigRequest(BaseModel):
    root_paths: List[str]
    openai_api_key: Optional[str] = None


class IndexRequest(BaseModel):
    full_rebuild: bool = False
    include_globs: Optional[List[str]] = None
    exclude_globs: Optional[List[str]] = None


class QueryRequest(BaseModel):
    query: str
    top_k: int = 8
    rerank_k: int = 20


class DocumentChunk(BaseModel):
    id: str
    text: str
    score: float
    source_path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None


class QueryResponse(BaseModel):
    answer: str
    context: List[DocumentChunk]
