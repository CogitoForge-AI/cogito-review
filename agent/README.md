# Nexo Co-Review Agent

OpenCode CLI review runner with bundled MCP tools (`coreview-git_*`, `coreview-ci_*`).

Each review runs as a one-shot container:

```bash
coreview-agent review run --review-id <uuid>
```

Inside the container, `opencode run` reads the review prompt from **stdin**. With `--print-logs` and `--log-level`, internal OpenCode logs stream to **stderr** in real time; `--format json` emits NDJSON events on **stdout**. The Python wrapper streams both pipes to container stdout so the worker can follow progress via `docker logs`.

MCP tools are started as a local stdio subprocess (`coreview-agent serve --transport stdio`), not as HTTP servers.

Review skills for OpenCode live in `skills/` and are copied into the image at `/opencode/skills/`.

```bash
cd agent && uv sync
uv run coreview-agent review run --review-id <uuid>
```

Docker image (OpenCode + MCP + git):

Built automatically on `make dev` / `make prod-up`, or manually:

```bash
make build-agent   # docker compose build agent-image
```
