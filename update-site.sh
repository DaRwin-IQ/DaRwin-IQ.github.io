#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

COMMIT_MESSAGE="${1:-Update site files}"

echo "Building repository files..."
"$ROOT_DIR/build-repo.sh"

echo "Validating repository files..."
"$ROOT_DIR/validate-repo.sh"

echo "Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "No new changes to commit."
else
  echo "Creating commit: $COMMIT_MESSAGE"
  git commit -m "$COMMIT_MESSAGE"
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "Could not detect the current git branch. Checkout a branch before pushing." >&2
  exit 1
fi

echo "Pushing to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"
