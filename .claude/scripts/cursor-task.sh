#!/usr/bin/env bash
set -euo pipefail

TASK_NUM="${1:?Usage: cursor-task.sh <task-number>}"
if ! [[ "$TASK_NUM" =~ ^[1-9][0-9]*$ ]]; then
  echo "Error: task number must be a positive integer, got: ${TASK_NUM}"
  exit 1
fi
REPO_ROOT_RAW="$(git rev-parse --show-toplevel)"

resolve_realpath() {
  local input_path="$1"

  if command -v realpath >/dev/null 2>&1; then
    realpath "$input_path"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$input_path" <<'PY'
import os
import sys

sys.stdout.write(os.path.realpath(sys.argv[1]))
PY
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "const fs = require('node:fs'); process.stdout.write(fs.realpathSync.native(process.argv[1]));" "$input_path"
    return 0
  fi

  return 1
}

if ! REPO_ROOT="$(resolve_realpath "$REPO_ROOT_RAW")"; then
  echo "Error: could not canonicalize repository root '${REPO_ROOT_RAW}'."
  exit 1
fi
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

FILES_HEADER_COUNT=$(echo "$TASK_CONTENT" | grep -cE '\*\*Files\*\*:?' || true)

FILES=$(echo "$TASK_CONTENT" | awk '
BEGIN { in_files = 0 }
/\*\*Files\*\*:?/ {
  rest = $0
  sub(/.*\*\*Files\*\*:?[[:space:]]*/, "", rest)
  gsub(/`/, "", rest)
  gsub(/[[:space:]]+$/, "", rest)
  if (rest != "") {
    n = split(rest, parts, /,/)
    for (i = 1; i <= n; i++) {
      gsub(/^[[:space:]*-]+/, "", parts[i])
      gsub(/[[:space:]]+$/, "", parts[i])
      if (parts[i] != "") print parts[i]
    }
  } else {
    in_files = 1
  }
  next
}
in_files && /^\*\*[A-Za-z]/ { exit }
in_files && /^[[:space:]]*$/ { exit }
in_files {
  line = $0
  gsub(/`/, "", line)
  gsub(/^[[:space:]*-]+/, "", line)
  gsub(/[[:space:]]+$/, "", line)
  n = split(line, parts, /,/)
  for (i = 1; i <= n; i++) {
    gsub(/^[[:space:]]+/, "", parts[i])
    gsub(/[[:space:]]+$/, "", parts[i])
    if (parts[i] != "") print parts[i]
  }
}
')

if [[ "$FILES_HEADER_COUNT" -gt 0 ]] && [[ -z "$FILES" ]]; then
  echo "Error: Task ${TASK_NUM} has a Files section but no file paths could be extracted."
  exit 1
fi

resolve_candidate_path() {
  local file_path="$1"

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$REPO_ROOT" "$file_path" <<'PY'
import os
import sys

repo_root = sys.argv[1]
file_path = sys.argv[2]

try:
    candidate_input = file_path if os.path.isabs(file_path) else os.path.join(repo_root, file_path)
    normalized = os.path.normpath(os.path.realpath(candidate_input))
except Exception as exc:
    print(f"Error: failed to normalize path '{file_path}': {exc}", file=sys.stderr)
    raise SystemExit(1)

sys.stdout.write(normalized)
PY
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "const fs = require('node:fs'); const path = require('node:path'); const repoRoot = process.argv[1]; const filePath = process.argv[2]; const candidate = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath); const trailing = []; let current = candidate; while (!fs.existsSync(current)) { trailing.unshift(path.basename(current)); const parent = path.dirname(current); if (parent === current) break; current = parent; } const realBase = fs.realpathSync.native(current); process.stdout.write(path.join(realBase, ...trailing));" "$REPO_ROOT" "$file_path"
    return 0
  fi

  return 1
}

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
    [[ -z "$f" ]] && continue
    CANDIDATE=""
    if ! CANDIDATE="$(resolve_candidate_path "$f")"; then
      echo "Warning: could not resolve path '${f}' - skipping"
      continue
    fi
    if [[ -z "$CANDIDATE" ]]; then
      echo "Warning: could not resolve path '${f}' — skipping"
      continue
    fi
    if [[ "$CANDIDATE" != "$REPO_ROOT" ]] && [[ "$CANDIDATE" != "$REPO_ROOT/"* ]]; then
      echo "Warning: path '${f}' escapes repository root — skipping"
      continue
    fi
    FILE_ARGS+=("$CANDIDATE")
  done <<< "$FILES"
  if [[ "${#FILE_ARGS[@]}" -eq 0 ]]; then
    echo "Error: Task ${TASK_NUM} has a Files section but all extracted paths were rejected."
    exit 1
  fi
  "$CURSOR_CMD" "${FILE_ARGS[@]}" &
else
  echo "No files specified. Opening Cursor in project root."
  "$CURSOR_CMD" "$REPO_ROOT" &
fi

echo ""
echo "Tip: Reference @.claude/scratchpad/current-task.md in Cursor chat"
