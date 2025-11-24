from pathlib import Path
from pydantic import BaseModel
import os


class Settings(BaseModel):
    storage_dir: Path = Path(os.path.expanduser("~")) / ".local_rag_store"
    default_include_globs: list[str] = [
        "**/*.txt",
        "**/*.md",
        "**/*.py",
        "**/*.js",
        "**/*.ts",
        "**/*.tsx",
        "**/*.json",
        "**/*.yaml",
        "**/*.yml",
    ]
    default_exclude_globs: list[str] = [
        "**/.git/**",
        "**/.venv/**",
        "**/node_modules/**",
        "**/.idea/**",
        "**/.vscode/**",
        "**/__pycache__/**",
    ]
    max_file_size_mb: int = 25


settings = Settings()
