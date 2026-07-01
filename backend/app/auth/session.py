import json
import secrets
from uuid import UUID

import redis.asyncio as redis

from app.config import get_code_review_settings

SESSION_PREFIX = "cogito:session:"
USER_SESSIONS_PREFIX = "cogito:user_sessions:"


def _redis_client() -> redis.Redis:
    settings = get_code_review_settings()
    return redis.from_url(settings.celery_broker_url, decode_responses=True)


def _user_sessions_key(user_id: UUID) -> str:
    return f"{USER_SESSIONS_PREFIX}{user_id}"


async def create_session(*, user_id: UUID) -> str:
    session_id = secrets.token_urlsafe(32)
    payload = json.dumps({"user_id": str(user_id)})
    client = _redis_client()
    try:
        settings = get_code_review_settings()
        session_key = f"{SESSION_PREFIX}{session_id}"
        await client.setex(
            session_key,
            settings.session_ttl_seconds,
            payload,
        )
        await client.sadd(_user_sessions_key(user_id), session_id)
        await client.expire(_user_sessions_key(user_id), settings.session_ttl_seconds)
    finally:
        await client.aclose()
    return session_id


async def get_session_user_id(session_id: str) -> UUID | None:
    client = _redis_client()
    try:
        raw = await client.get(f"{SESSION_PREFIX}{session_id}")
    finally:
        await client.aclose()
    if not raw:
        return None
    data = json.loads(raw)
    return UUID(data["user_id"])


async def destroy_session(session_id: str) -> None:
    client = _redis_client()
    try:
        session_key = f"{SESSION_PREFIX}{session_id}"
        raw = await client.get(session_key)
        await client.delete(session_key)
        if raw:
            data = json.loads(raw)
            user_id = UUID(data["user_id"])
            await client.srem(_user_sessions_key(user_id), session_id)
    finally:
        await client.aclose()


async def revoke_all_sessions_for_user(user_id: UUID) -> None:
    client = _redis_client()
    try:
        user_key = _user_sessions_key(user_id)
        session_ids = await client.smembers(user_key)
        if session_ids:
            session_keys = [f"{SESSION_PREFIX}{sid}" for sid in session_ids]
            await client.delete(*session_keys)
        await client.delete(user_key)
    finally:
        await client.aclose()
