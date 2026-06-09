from __future__ import annotations

from pathlib import Path

from llama_index.core import Document

from app.settings import config


def load_documents() -> list[Document]:
    data_path = Path(config.data_dir)
    docs: list[Document] = []
    for path in sorted(data_path.glob("**/*")):
        if path.is_file() and path.suffix.lower() in {".txt", ".md"}:
            docs.append(Document(text=path.read_text(encoding="utf-8"), metadata={"file_name": path.name}))
    return docs
