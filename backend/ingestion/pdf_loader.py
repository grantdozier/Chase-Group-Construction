from __future__ import annotations

from pathlib import Path
from typing import Iterable

from pypdf import PdfReader

from .types import SupportedDoc


def load_pdf(path: Path) -> Iterable[SupportedDoc]:
    try:
        reader = PdfReader(str(path))
    except Exception:
        return []

    docs: list[SupportedDoc] = []
    for page_index, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception:
            continue
        if not text.strip():
            continue
        docs.append(
            SupportedDoc(
                source_path=str(path.resolve()),
                text=text,
                extra={"page": page_index + 1},
            )
        )
    return docs
