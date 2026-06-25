#!/usr/bin/env bash
set -euo pipefail

workspace="$1"
action="$2"
shift 2

root="$(git rev-parse --show-toplevel)"
cd "$root/$workspace"

args=()
for file in "$@"; do
  args+=("${file#${workspace}/}")
done

case "$action" in
  check) uv run ruff check --fix "${args[@]}" ;;
  format) uv run ruff format "${args[@]}" ;;
  *)
    echo "usage: $0 <workspace> check|format [files...]" >&2
    exit 1
    ;;
esac
