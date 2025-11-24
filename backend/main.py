from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import ConfigRequest, IndexRequest, QueryRequest, QueryResponse, DocumentChunk
from .rag import LocalRAGEngine


app = FastAPI(title="Local RAG Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this later to your GitHub Pages domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_rag_engine: Optional[LocalRAGEngine] = None
_root_paths: list[Path] = []


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "indexed_paths": [str(p) for p in _root_paths]}


@app.post("/config")
async def configure(req: ConfigRequest) -> dict:
    global _rag_engine, _root_paths

    if not req.root_paths:
        raise HTTPException(status_code=400, detail="At least one root path is required")

    root_paths = [Path(p).expanduser().resolve() for p in req.root_paths]
    for p in root_paths:
        if not p.exists():
            raise HTTPException(status_code=400, detail=f"Path does not exist: {p}")

    api_key = req.openai_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing OpenAI API key")

    storage_dir = Path.home() / ".local_rag_store"
    _rag_engine = LocalRAGEngine(storage_dir=storage_dir, openai_api_key=api_key)
    _root_paths = root_paths

    return {"status": "configured", "root_paths": [str(p) for p in root_paths]}


@app.post("/index")
async def index_files(req: IndexRequest) -> dict:
    if _rag_engine is None or not _root_paths:
        raise HTTPException(status_code=400, detail="Backend not configured. Call /config first.")

    count = _rag_engine.index_paths(
        root_paths=_root_paths,
        include_globs=req.include_globs or None,
        exclude_globs=req.exclude_globs or None,
        full_rebuild=req.full_rebuild,
    )
    return {"indexed_files": count}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest) -> QueryResponse:
    if _rag_engine is None or not _root_paths:
        raise HTTPException(status_code=400, detail="Backend not configured. Call /config first.")

    answer, context_items = _rag_engine.query(req.query, top_k=req.top_k, rerank_k=req.rerank_k)
    context_chunks = [DocumentChunk(**item) for item in context_items]
    return QueryResponse(answer=answer, context=context_chunks)
