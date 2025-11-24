from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class SupportedDoc:
    source_path: str
    text: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    extra: dict | None = None
