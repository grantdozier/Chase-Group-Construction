from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ConfigRequest(BaseModel):
    root_paths: List[str]
    openai_api_key: Optional[str] = None


class IndexRequest(BaseModel):
    full_rebuild: bool = False
    include_globs: Optional[List[str]] = None
    exclude_globs: Optional[List[str]] = None


class ChatTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class QueryRequest(BaseModel):
    query: str
    top_k: int = 8
    rerank_k: int = 20
    history: Optional[List[ChatTurn]] = None


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


class WorkflowStepData(BaseModel):
    step_id: str
    data: Dict[str, Any] = {}


class WorkflowRun(BaseModel):
    id: str
    label: str
    address: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status: str = "in_progress"  # e.g. in_progress, completed
    steps: List[WorkflowStepData] = []


class WorkflowCreateRequest(BaseModel):
    label: str
    address: Optional[str] = None


class SiteCredential(BaseModel):
    site: str
    username: str
    password: str


class CredentialUpdateRequest(BaseModel):
    username: str
    password: str
