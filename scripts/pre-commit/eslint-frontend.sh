#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)/frontend"

args=()
for file in "$@"; do
  args+=("${file#frontend/}")
done

yarn eslint --fix "${args[@]}"
