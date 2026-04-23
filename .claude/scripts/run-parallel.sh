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

declare -a TASK_PIDS=()
declare -a TASK_IDS=()
FAILED=0

for TASK_NUM in $PARALLEL_TASKS; do
  if [[ ! "$TASK_NUM" =~ ^[0-9]+$ ]]; then
    echo "ERROR: Refusing to launch task with unexpected identifier '${TASK_NUM}'." | tee -a "$LOG_FILE" >&2
    exit 1
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Launching Task ${TASK_NUM}..." | tee -a "$LOG_FILE"
  bash "${SCRIPT_DIR}/cursor-task.sh" "$TASK_NUM" &
  TASK_PIDS+=("$!")
  TASK_IDS+=("$TASK_NUM")
  sleep 1
done

for IDX in "${!TASK_PIDS[@]}"; do
  PID="${TASK_PIDS[$IDX]}"
  TID="${TASK_IDS[$IDX]}"
  if wait "$PID"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Task ${TID} (pid ${PID}) completed successfully." | tee -a "$LOG_FILE"
  else
    STATUS=$?
    FAILED=1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Task ${TID} (pid ${PID}) failed with exit code ${STATUS}." | tee -a "$LOG_FILE"
  fi
done

COMPLETED_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
if [[ "$FAILED" -ne 0 ]]; then
  echo "[$COMPLETED_TIMESTAMP] One or more parallel tasks failed. See log above." | tee -a "$LOG_FILE"
  echo ""
  echo "Log: ${LOG_FILE}"
  exit 1
fi

echo "[$COMPLETED_TIMESTAMP] All parallel tasks completed." | tee -a "$LOG_FILE"
echo ""
echo "Log: ${LOG_FILE}"
