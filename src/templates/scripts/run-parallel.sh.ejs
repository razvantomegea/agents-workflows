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

echo "[$TIMESTAMP] Starting parallel tasks: ${PARALLEL_TASKS//$'\n'/, }" | tee -a "$LOG_FILE"

for TASK_NUM in $PARALLEL_TASKS; do
  echo "[$TIMESTAMP] Launching Task ${TASK_NUM}..." | tee -a "$LOG_FILE"
  bash "${SCRIPT_DIR}/cursor-task.sh" "$TASK_NUM" &
  sleep 1
done

wait
COMPLETED_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$COMPLETED_TIMESTAMP] All parallel tasks completed." | tee -a "$LOG_FILE"
echo ""
echo "Log: ${LOG_FILE}"
