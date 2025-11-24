from __future__ import annotations

from pathlib import Path


def is_probably_text(path: Path, blocksize: int = 1024) -> bool:
    try:
        with path.open("rb") as f:
            chunk = f.read(blocksize)
    except OSError:
        return False

    if not chunk:
        return True

    # crude binary detection: presence of null bytes
    if b"\x00" in chunk:
        return False

    return True


def chunk_text(text: str, max_chars: int = 1200, overlap: int = 200) -> list[str]:
    if max_chars <= 0:
        return [text]

    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_chars, n)
        chunks.append(text[start:end])
        if end == n:
            break
        start = max(0, end - overlap)
    return chunks
