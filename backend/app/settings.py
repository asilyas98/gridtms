from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    use_aws: bool = os.getenv("USE_AWS", "false").lower() == "true"
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    aws_profile: str | None = os.getenv("AWS_PROFILE") or None

    data_dir: str = os.getenv("DATA_DIR", "sample_data")
    persist_dir: str = os.getenv("PERSIST_DIR", "storage")

    bedrock_embed_model: str = os.getenv("BEDROCK_EMBED_MODEL", "amazon.titan-embed-text-v2:0")
    bedrock_llm_model: str = os.getenv("BEDROCK_LLM_MODEL", "us.amazon.nova-lite-v1:0")

    vector_db: str = os.getenv("VECTOR_DB", "supabase")
    supabase_db_url: str | None = os.getenv("SUPABASE_DB_URL") or None
    supabase_collection: str = os.getenv("SUPABASE_COLLECTION", "logistics_rag")

    # Supabase Auth verification. These are server-side values used to verify Bearer tokens.
    supabase_url: str | None = os.getenv("SUPABASE_URL") or None
    supabase_anon_key: str | None = os.getenv("SUPABASE_ANON_KEY") or None

    # format = validate format only. strict = must exist in verified_carriers table.
    # Use strict in production.
    carrier_verification_mode: str = os.getenv("CARRIER_VERIFICATION_MODE", "strict").lower()


config = Config()
