import logging

from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown

from app.config import get_code_review_settings
from app.database import close_db_pool, init_db_pool, run_db

logger = logging.getLogger(__name__)

settings = get_code_review_settings()

celery_app = Celery(
    "code_review",
    broker=settings.celery_broker_url,
    backend=settings.celery_broker_url,
    include=["app.jobs.review"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_soft_time_limit=settings.review_timeout_seconds,
    task_time_limit=settings.review_timeout_seconds + 60,
)


@worker_process_init.connect
def _init_worker_db_pool(**_: object) -> None:
    run_db(init_db_pool())


@worker_process_shutdown.connect
def _close_worker_db_pool(**_: object) -> None:
    run_db(close_db_pool())
