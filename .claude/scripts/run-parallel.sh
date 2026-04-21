#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
PLAN_FILE="${REPO_ROOT}/PLAN.md"
SCRATCHPAD="${REPO_ROOT}/.claude/scratchpad"
LOG_FILE="${SCRATCHPAD}/running.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "Error: PLAN.md not found at ${PLAN_FILE}"
  exit 1
fi

PARALLEL_TASKS=$(awk '/^### Task [0-9]+.*\[PARALLEL\]/{match($0, /[0-9]+/); print substr($0, RSTART, RLENGTH)}' "$PLAN_FILE" || true)

if [[ -z "$PARALLEL_TASKS" ]]; then
  echo "No [PARALLEL] tasks found in PLAN.md"
  exit 0
fi

mkdir -p "$SCRATCHPAD"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting parallel tasks: $(echo "$PARALLEL_TASKS" | tr '\n' ', ')" | tee -a "$LOG_FILE"

PIDS=()
TASK_NUMS=()
while IFS= read -r TASK_NUM; do
  [[ -z "$TASK_NUM" ]] && continue
  echo "[$TIMESTAMP] Launching Task ${TASK_NUM}..." | tee -a "$LOG_FILE"
  bash "${SCRIPT_DIR}/cursor-task.sh" "$TASK_NUM" &
  PIDS+=($!)
  TASK_NUMS+=("$TASK_NUM")
  sleep 1
done <<< "$PARALLEL_TASKS"

FAILURES=0
for i in "${!PIDS[@]}"; do
  pid="${PIDS[$i]}"
  task="${TASK_NUMS[$i]}"
  if ! wait "$pid"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Task ${task} (pid ${pid}) failed" | tee -a "$LOG_FILE"
    FAILURES=$((FAILURES + 1))
  fi
done

COMPLETED_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
if [[ "$FAILURES" -gt 0 ]]; then
  echo "[$COMPLETED_TIMESTAMP] Parallel tasks completed with ${FAILURES} failure(s)." | tee -a "$LOG_FILE"
  echo ""
  echo "Log: ${LOG_FILE}"
  exit 1
fi
echo "[$COMPLETED_TIMESTAMP] All parallel tasks completed." | tee -a "$LOG_FILE"
echo ""
echo "Log: ${LOG_FILE}"
