from __future__ import annotations

from pathlib import Path
from typing import Iterable

from ..utils import is_probably_text, chunk_text
from .types import SupportedDoc
from .pdf_loader import load_pdf
from .docx_loader import load_docx


def _load_text_file(path: Path) -> list[SupportedDoc]:
    if not is_probably_text(path):
        return []

    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []

    chunks = chunk_text(raw)
    docs: list[SupportedDoc] = []
    for idx, chunk in enumerate(chunks):
        docs.append(
            SupportedDoc(
                source_path=str(path.resolve()),
                text=chunk,
                extra={"chunk_index": idx},
            )
        )
    return docs


def ingest_file(path: Path) -> Iterable[SupportedDoc]:
    suffix = path.suffix.lower()

    if suffix in {".txt", ".md", ".py", ".js", ".ts", ".tsx", ".json", ".yaml", ".yml"}:
        return _load_text_file(path)

    if suffix == ".pdf":
        return list(load_pdf(path))

    if suffix == ".docx":
        return list(load_docx(path))

    # TODO: add PDF, DOCX, image, audio, video loaders

    return []
