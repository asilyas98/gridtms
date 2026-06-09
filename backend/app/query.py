from __future__ import annotations

from pathlib import Path

from llama_index.core import StorageContext, VectorStoreIndex, load_index_from_storage

from app.load_docs import load_documents
from app.models import configure_llamaindex
from app.settings import config


def load_index():
    configure_llamaindex()
    persist_dir = Path(config.persist_dir)
    if persist_dir.exists() and any(persist_dir.iterdir()):
        storage_context = StorageContext.from_defaults(persist_dir=str(persist_dir))
        return load_index_from_storage(storage_context)

    docs = load_documents()
    index = VectorStoreIndex.from_documents(docs)
    index.storage_context.persist(persist_dir=str(persist_dir))
    return index
