import os
from pathlib import Path
from typing import List, Iterable, Optional, Dict

import chromadb
import requests

from .config import settings
from .ingestion import ingest_file, SupportedDoc


class OpenAIHttpClient:
    """Very small HTTP client for OpenAI embeddings and chat, using requests."""

    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1") -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def embeddings(self, model: str, inputs: List[str]) -> List[List[float]]:
        if not inputs:
            return []
        url = f"{self.base_url}/embeddings"
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={"model": model, "input": inputs},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return [item["embedding"] for item in data["data"]]

    def chat(self, model: str, messages: List[dict]) -> str:
        url = f"{self.base_url}/chat/completions"
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={"model": model, "messages": messages},
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


class OpenAIEmbeddingFn:
    """Minimal embedding function compatible with Chroma, using OpenAIHttpClient."""

    def __init__(self, http_client: OpenAIHttpClient, model_name: str = "text-embedding-3-large") -> None:
        self._client = http_client
        self._model_name = model_name

    def __call__(self, input: List[str]) -> List[List[float]]:  # chroma expects a callable(input=[...])
        return self._client.embeddings(self._model_name, input)


class LocalRAGEngine:
    def __init__(self, storage_dir: Path, openai_api_key: str) -> None:
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        self._openai = OpenAIHttpClient(api_key=openai_api_key)

        self.client = chromadb.PersistentClient(path=str(self.storage_dir / "chroma"))
        self._init_collection()

    def _init_collection(self) -> None:
        embedding_fn = OpenAIEmbeddingFn(http_client=self._openai, model_name="text-embedding-3-large")
        self.collection = self.client.get_or_create_collection(
            name="local-files",
            embedding_function=embedding_fn,
        )

    def index_paths(self, root_paths: List[Path], include_globs: List[str] | None = None, exclude_globs: List[str] | None = None, full_rebuild: bool = False) -> int:
        if full_rebuild:
            # For a full rebuild, drop and recreate the collection to avoid delete() argument constraints
            try:
                self.client.delete_collection("local-files")
            except Exception:
                # It's fine if it doesn't exist yet
                pass
            self._init_collection()

        include_globs = include_globs or settings.default_include_globs
        exclude_globs = exclude_globs or settings.default_exclude_globs

        files = list(self._iter_files(root_paths, include_globs, exclude_globs))
        ids: List[str] = []
        texts: List[str] = []
        metadatas: List[dict] = []

        for file_path in files:
            for doc_idx, doc in enumerate(ingest_file(file_path)):
                doc_id = f"{doc.source_path}::chunk-{doc_idx}"
                ids.append(doc_id)
                texts.append(doc.text)
                metadata: dict = {
                    "source_path": doc.source_path,
                }
                if doc.start_line is not None:
                    metadata["start_line"] = doc.start_line
                if doc.end_line is not None:
                    metadata["end_line"] = doc.end_line
                if doc.extra:
                    metadata.update(doc.extra)
                metadatas.append(metadata)

        if ids:
            self.collection.upsert(ids=ids, documents=texts, metadatas=metadatas)
        return len(ids)

    def query(self, query: str, history: Optional[List[Dict[str, str]]] = None, top_k: int = 8, rerank_k: int = 20) -> tuple[str, List[dict]]:
        # Basic retrieval from Chroma
        results = self.collection.query(query_texts=[query], n_results=top_k)
        docs = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]

        context_snippets: List[str] = []
        context_items: List[dict] = []
        for doc, meta, dist in zip(docs, metadatas, distances):
            snippet = doc[:1200]
            context_snippets.append(snippet)
            context_items.append({
                "id": meta.get("source_path", ""),
                "text": snippet,
                "score": float(dist),
                "source_path": meta.get("source_path", ""),
            })

        prompt = self._build_prompt(query, context_snippets)

        history_msgs: List[Dict[str, str]] = []
        for turn in (history or [])[-5:]:  # only last 5 messages
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if not content:
                continue
            history_msgs.append({"role": role, "content": content})

        messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": "You are a RAG assistant. Use the conversation history and the retrieved context to answer. Answer based ONLY on the provided context, and cite file paths explicitly.",
            },
            *history_msgs,
            {"role": "user", "content": prompt},
        ]

        answer = self._openai.chat(
            model="gpt-4.1-mini",
            messages=messages,
        )
        return answer, context_items

    def _iter_files(self, root_paths: Iterable[Path], include_globs: List[str] | None, exclude_globs: List[str] | None) -> Iterable[Path]:
        include_globs = include_globs or ["**/*.txt", "**/*.md", "**/*.py", "**/*.json", "**/*.yaml", "**/*.yml"]
        exclude_globs = exclude_globs or ["**/.git/**", "**/.venv/**", "**/node_modules/**", "**/.idea/**", "**/.vscode/**"]

        for root in root_paths:
            root = root.expanduser().resolve()
            if not root.exists():
                continue

            for pattern in include_globs:
                for path in root.glob(pattern):
                    excluded = any(path.match(ex_pat) for ex_pat in exclude_globs)
                    if excluded or not path.is_file():
                        continue
                    yield path

    def _build_prompt(self, query: str, context_snippets: List[str]) -> str:
        context_block = "\n\n".join(f"[Document {i+1}]\n" + snippet for i, snippet in enumerate(context_snippets))
        return (
            "Context documents (retrieved from the user's files):\n\n"
            f"{context_block}\n\n"
            f"Current user question: {query}\n\n"
            "Use both the conversation history and the context above. If the answer is not contained there, say you don't know."
        )
