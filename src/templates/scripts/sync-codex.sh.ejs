#!/usr/bin/env bash
set -euo pipefail

COPY_SKILLS=0
if [[ "${1:-}" == "--copy-skills" ]]; then
  COPY_SKILLS=1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CODEX_ROOT="${REPO_ROOT}/.codex"
PROJECT_SKILLS="${CODEX_ROOT}/skills"
PROJECT_PROMPTS="${CODEX_ROOT}/prompts"
AGENTS_ROOT="${REPO_ROOT}/.agents"
AGENTS_SKILLS="${AGENTS_ROOT}/skills"
USER_PROMPTS="${HOME}/.codex/prompts"

clear_generated_skills_dir() {
  local target_path
  target_path="$(cd "$(dirname "$AGENTS_SKILLS")" && pwd)/$(basename "$AGENTS_SKILLS")"

  case "$target_path" in
    "${AGENTS_ROOT}"/*) rm -rf "$target_path" ;;
    *)
      echo "Refusing to remove path outside generated .agents directory: $target_path" >&2
      exit 1
      ;;
  esac
}

if [[ ! -d "$PROJECT_SKILLS" ]]; then
  echo "Missing project skills directory: $PROJECT_SKILLS" >&2
  exit 1
fi

if [[ ! -d "$PROJECT_PROMPTS" ]]; then
  echo "Missing project prompts directory: $PROJECT_PROMPTS" >&2
  exit 1
fi

mkdir -p "$USER_PROMPTS"
while IFS= read -r -d '' prompt_file; do
  cp "$prompt_file" "$USER_PROMPTS"/
done < <(find "$PROJECT_PROMPTS" -mindepth 1 -maxdepth 1 -type f -name '*.md' -print0)

mkdir -p "$AGENTS_ROOT"

if [[ -e "$AGENTS_SKILLS" || -L "$AGENTS_SKILLS" ]]; then
  if [[ -L "$AGENTS_SKILLS" ]]; then
    CURRENT_TARGET="$(readlink "$AGENTS_SKILLS")"
    EXPECTED_TARGET="../.codex/skills"
    if [[ "$CURRENT_TARGET" != "$EXPECTED_TARGET" && "$CURRENT_TARGET" != "$PROJECT_SKILLS" ]]; then
      echo "Existing .agents/skills points to '$CURRENT_TARGET', expected '$EXPECTED_TARGET'." >&2
      exit 1
    fi
  elif [[ "$COPY_SKILLS" == "1" ]]; then
    clear_generated_skills_dir
    mkdir -p "$AGENTS_SKILLS"
    cp -R "$PROJECT_SKILLS"/. "$AGENTS_SKILLS"/
  else
    echo ".agents/skills already exists as a real directory; leaving it untouched."
    echo "Run with --copy-skills to replace it with a fresh copy from .codex/skills."
  fi
elif [[ "$COPY_SKILLS" == "1" ]]; then
  mkdir -p "$AGENTS_SKILLS"
  cp -R "$PROJECT_SKILLS"/. "$AGENTS_SKILLS"/
else
  if ! ln -s ../.codex/skills "$AGENTS_SKILLS" 2>/dev/null; then
    echo "Could not create a symlink; falling back to a copied .agents/skills tree."
    mkdir -p "$AGENTS_SKILLS"
    cp -R "$PROJECT_SKILLS"/. "$AGENTS_SKILLS"/
  fi
fi

while IFS= read -r -d '' skill_dir; do
  if [[ ! -f "${skill_dir}/SKILL.md" ]]; then
    echo "Skill directory missing SKILL.md: ${skill_dir}" >&2
    exit 1
  fi
done < <(find "$PROJECT_SKILLS" -mindepth 1 -maxdepth 1 -type d -print0)

PROMPT_COUNT="$(find "$PROJECT_PROMPTS" -mindepth 1 -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')"
SKILL_COUNT="$(find "$PROJECT_SKILLS" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"

echo "Synced ${PROMPT_COUNT} Codex prompt(s) to ${USER_PROMPTS}."
echo "Wired ${SKILL_COUNT} Codex skill(s) through ${AGENTS_SKILLS}."
echo "Do not map SKILL.md files through agents.*.config_file; Codex discovers them via .agents/skills."
