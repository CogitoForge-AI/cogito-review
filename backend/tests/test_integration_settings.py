from datetime import UTC, datetime
from uuid import uuid4

from app.providers.opencode_config import build_opencode_config_from_llm_providers
from app.repositories.llm_providers import LlmProviderRow
from app.repositories.repo_integrations import RepoIntegrationRow
from app.services.provider_resolution import build_providers_config


def _llm_row() -> LlmProviderRow:
    now = datetime.now(UTC)
    return LlmProviderRow(
        id=uuid4(),
        name="Default",
        provider_id="openai-compat",
        base_url="https://llm.example.com/v1",
        api_token="sk-abc",
        model="my-model",
        opencode_model="",
        is_default=True,
        created_at=now,
        updated_at=now,
    )


def _repo_row(llm_id) -> RepoIntegrationRow:
    now = datetime.now(UTC)
    return RepoIntegrationRow(
        id=uuid4(),
        name="acme/app",
        git_provider="github",
        repo_full_name="acme/app",
        github_webhook_secret="secret",
        github_token="token",
        llm_provider_id=llm_id,
        enabled=True,
        created_at=now,
        updated_at=now,
    )


def test_build_opencode_config_from_llm_providers_literals() -> None:
    llm = _llm_row()
    config = build_opencode_config_from_llm_providers([llm], llm)
    provider = config["provider"]["openai-compat"]
    assert provider["options"]["baseURL"] == "https://llm.example.com/v1"
    assert provider["options"]["apiKey"] == "sk-abc"


def test_build_providers_config_overlay() -> None:
    llm = _llm_row()
    repo = _repo_row(llm.id)
    cfg = build_providers_config(repo, llm)
    assert cfg.github_token == "token"
    assert cfg.llm_base_url == "https://llm.example.com/v1"
    assert cfg.resolved_opencode_model == "openai-compat/my-model"


def test_repo_integration_matches_repo() -> None:
    llm = _llm_row()
    repo = _repo_row(llm.id)
    assert repo.matches_repo("acme/app") is True
    assert repo.matches_repo("other/app") is False

    catch_all = RepoIntegrationRow(
        id=uuid4(),
        name="All",
        git_provider="github",
        repo_full_name="",
        github_webhook_secret="",
        github_token="",
        llm_provider_id=llm.id,
        enabled=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    assert catch_all.matches_repo("any/repo") is True
