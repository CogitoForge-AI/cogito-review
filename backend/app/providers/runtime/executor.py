from __future__ import annotations

from typing import Protocol

from app.providers.runtime.specs import JobResult, JobSpec


class JobExecutor(Protocol):
    async def run(self, spec: JobSpec) -> JobResult: ...

    async def cleanup_stale(self, labels: dict[str, str]) -> None: ...
