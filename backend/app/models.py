from __future__ import annotations

from llama_index.core import Settings
from llama_index.core.embeddings import MockEmbedding
from llama_index.core.llms import MockLLM

from app.settings import config


def configure_llamaindex() -> None:
    if not config.use_aws:
        Settings.embed_model = MockEmbedding(embed_dim=1536)
        Settings.llm = MockLLM(max_tokens=512)
        return

    session_kwargs = {"region_name": config.aws_region}
    if config.aws_profile:
        session_kwargs["profile_name"] = config.aws_profile

    from llama_index.embeddings.bedrock import BedrockEmbedding
    from llama_index.llms.bedrock_converse import BedrockConverse

    Settings.embed_model = BedrockEmbedding(
        model_name=config.bedrock_embed_model,
        **session_kwargs,
    )
    Settings.llm = BedrockConverse(
        model=config.bedrock_llm_model,
        temperature=0.1,
        **session_kwargs,
    )
