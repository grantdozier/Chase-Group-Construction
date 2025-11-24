from __future__ import annotations

from pathlib import Path
from typing import Iterable

import docx

from .types import SupportedDoc


def load_docx(path: Path) -> Iterable[SupportedDoc]:
    try:
        document = docx.Document(str(path))
    except Exception:
        return []

    texts: list[str] = []
    for para in document.paragraphs:
        if para.text.strip():
            texts.append(para.text)

    if not texts:
        return []

    full_text = "\n".join(texts)

    return [
        SupportedDoc(
            source_path=str(path.resolve()),
            text=full_text,
            extra={"doc_type": "docx"},
        )
    ]
