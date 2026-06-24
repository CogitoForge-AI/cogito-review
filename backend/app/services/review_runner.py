import logging

from app.providers.factory import get_providers
from app.providers.runtime.specs import ReviewJobRequest

logger = logging.getLogger(__name__)


async def execute_review_logic(review_id: str) -> None:
    """Delegate review execution to a one-shot agent job via the runtime provider."""
    runtime = get_providers().runtime
    await runtime.run_review_job(ReviewJobRequest(review_id=review_id))
    logger.info("Review %s finished in agent container", review_id)
