"""MCP configuration helpers for OpenCode."""

from app.config import CodeReviewSettings


def build_mcp_config(_infra: CodeReviewSettings | None = None) -> dict:
    """Configure coreview MCP as a local stdio subprocess for `opencode run`."""
    return {
        "coreview": {
            "type": "local",
            "command": ["coreview-agent", "serve", "--transport", "stdio"],
            "enabled": True,
        }
    }


def build_code_reviewer_agent_config(agent_name: str) -> dict:
    return {
        "description": "Reviews PR for bugs, security, and maintainability",
        "mode": "subagent",
        "tools": {
            "coreview-git_fetch_pr_context": True,
            "coreview-ci_get_summary": True,
        },
        "permission": {
            "edit": "deny",
            "write": "deny",
            "bash": {"*": "deny"},
        },
        "prompt": (
            "You are a code reviewer. Use MCP tools to gather context "
            "before reviewing: call coreview-git_fetch_pr_context and "
            "coreview-ci_get_summary with the repository and PR details "
            "from the prompt. Analyze the cloned workspace at the session "
            "directory. Do not post GitHub comments via MCP. Return findings "
            "as JSON matching the outputFormat schema in your final response. "
            "Focus on bugs, security issues, performance problems, and "
            "missing tests."
        ),
    }


def default_opencode_config_path():
    from pathlib import Path

    return Path("opencode.json")
