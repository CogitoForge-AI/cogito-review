from __future__ import annotations

from pathlib import Path

from app.providers.runtime.specs import JobSpec, VolumeMount

REVIEW_AGENT_ROLE = "review-agent"
REVIEW_ID_LABEL = "nexo.coreview.review_id"
REVIEW_ROLE_LABEL = "nexo.coreview.role"
OPENCODE_CONFIG_CONTAINER_PATH = "/config/opencode.json"


def resolve_opencode_config_path(opencode_config_path: str) -> Path:
    if opencode_config_path:
        return Path(opencode_config_path)
    return Path("opencode.generated.json")


def agent_config_volume_source(
    opencode_config_path: Path,
    opencode_config_host_path: str | None,
) -> str:
    if opencode_config_host_path:
        return str(Path(opencode_config_host_path).resolve())
    return str(opencode_config_path.resolve())


def agent_database_url(database_url: str, *, network: str | None) -> str:
    if network:
        return database_url
    return database_url.replace("@localhost:", "@host.docker.internal:").replace(
        "@127.0.0.1:", "@host.docker.internal:"
    )


def review_job_labels(review_id: str) -> dict[str, str]:
    return {
        REVIEW_ROLE_LABEL: REVIEW_AGENT_ROLE,
        REVIEW_ID_LABEL: review_id,
    }


def build_docker_review_job_spec(
    *,
    review_id: str,
    agent_image: str,
    workspace_root: str,
    database_url: str,
    opencode_config_path: Path,
    opencode_config_host_path: str | None,
    agent_network: str | None,
    opencode_log_level: str = "INFO",
) -> JobSpec:
    network = (agent_network or "").strip() or None
    config_volume_source = agent_config_volume_source(
        opencode_config_path,
        opencode_config_host_path,
    )
    volumes = (
        VolumeMount(
            source=config_volume_source,
            target=OPENCODE_CONFIG_CONTAINER_PATH,
            read_only=True,
            kind="bind",
        ),
    )
    environment = {
        "DATABASE_URL": agent_database_url(database_url, network=network),
        "OPENCODE_CONFIG": OPENCODE_CONFIG_CONTAINER_PATH,
        "NEXO_COREVIEW_WORKSPACE_ROOT": workspace_root,
        "NEXO_COREVIEW_OPENCODE_LOG_LEVEL": opencode_log_level,
        "PYTHONUNBUFFERED": "1",
    }
    return JobSpec(
        job_id=review_id,
        image=agent_image,
        command=[
            "coreview-agent",
            "review",
            "run",
            "--review-id",
            review_id,
        ],
        environment=environment,
        volumes=volumes,
        labels=review_job_labels(review_id),
        network=network,
        extra_hosts=None if network else {"host.docker.internal": "host-gateway"},
    )


def build_k8s_review_job_spec(
    *,
    review_id: str,
    agent_image: str,
    workspace_root: str,
    database_url: str,
    k8s_namespace: str,
    k8s_agent_config_configmap: str,
) -> JobSpec:
    """Build a K8s-oriented job spec (ConfigMap volume, in-cluster DB URL)."""
    volumes = (
        VolumeMount(
            source=k8s_agent_config_configmap,
            target=OPENCODE_CONFIG_CONTAINER_PATH,
            read_only=True,
            kind="configmap",
        ),
    )
    environment = {
        "DATABASE_URL": database_url,
        "OPENCODE_CONFIG": OPENCODE_CONFIG_CONTAINER_PATH,
        "NEXO_COREVIEW_WORKSPACE_ROOT": workspace_root,
        "PYTHONUNBUFFERED": "1",
    }
    return JobSpec(
        job_id=review_id,
        image=agent_image,
        command=[
            "coreview-agent",
            "review",
            "run",
            "--review-id",
            review_id,
        ],
        environment=environment,
        volumes=volumes,
        labels=review_job_labels(review_id),
        network=k8s_namespace,
    )
