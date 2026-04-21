#!/usr/bin/env bash
set -euo pipefail

TASK_NUM="${1:?Usage: cursor-task.sh <task-number>}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
PLAN_FILE="${REPO_ROOT}/PLAN.md"
SCRATCHPAD="${REPO_ROOT}/.claude/scratchpad"

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "Error: PLAN.md not found at ${PLAN_FILE}"
  exit 1
fi

CURSOR_CMD=""
if command -v cursor &>/dev/null; then
  CURSOR_CMD="cursor"
elif [[ -f "/c/Program Files/cursor/resources/app/bin/cursor" ]]; then
  CURSOR_CMD="/c/Program Files/cursor/resources/app/bin/cursor"
else
  echo "Error: cursor CLI not found in PATH."
  echo "Install: https://cursor.sh or add to PATH."
  exit 1
fi

TASK_CONTENT=$(awk -v task_num="$TASK_NUM" '
  $0 ~ "^### Task " task_num " " { in_task = 1; next }
  in_task && /^### Task [0-9]+ / { exit }
  in_task && /^## / { exit }
  in_task { print }
' "$PLAN_FILE")

if [[ -z "$TASK_CONTENT" ]]; then
  echo "Error: Task ${TASK_NUM} not found in PLAN.md"
  exit 1
fi

mkdir -p "$SCRATCHPAD"
echo "# Current Task ${TASK_NUM}" > "${SCRATCHPAD}/current-task.md"
echo "" >> "${SCRATCHPAD}/current-task.md"
sed -n "/^### Task ${TASK_NUM} /p" "$PLAN_FILE" >> "${SCRATCHPAD}/current-task.md"
echo "$TASK_CONTENT" >> "${SCRATCHPAD}/current-task.md"

FILES=$(echo "$TASK_CONTENT" | awk 'match($0, /\*\*Files\*\*: /) { print substr($0, RSTART + RLENGTH) }' | tr ',' '\n' | sed 's/^ *//;s/ *$//' | sed 's/`//g')

echo "=== Task ${TASK_NUM} ==="
sed -n "/^### Task ${TASK_NUM} /p" "$PLAN_FILE"
echo "$TASK_CONTENT"
echo ""
echo "Task written to: ${SCRATCHPAD}/current-task.md"
echo ""

if [[ -n "$FILES" ]]; then
  echo "Opening Cursor with files:"
  echo "$FILES"
  FILE_ARGS=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && FILE_ARGS+=("${REPO_ROOT}/${f}")
  done <<< "$FILES"
  "$CURSOR_CMD" "${FILE_ARGS[@]}" &
else
  echo "No files specified. Opening Cursor in project root."
  "$CURSOR_CMD" "$REPO_ROOT" &
fi

echo ""
echo "Tip: Reference @.claude/scratchpad/current-task.md in Cursor chat"
