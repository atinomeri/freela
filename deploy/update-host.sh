#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
DEPLOY_BRANCH="main"

if ! command -v docker >/dev/null 2>&1; then
  echo "[update-host] docker is not installed" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[update-host] docker compose plugin is not available" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[update-host] missing compose file: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -d "${PROJECT_ROOT}/.git" ]]; then
  echo "[update-host] project root is not a git repository: ${PROJECT_ROOT}" >&2
  exit 1
fi

RUN_PULL=true
RUN_MIGRATE=true
RUN_BUILD_GATE=true
HEALTH_URL="${DEPLOY_HEALTHCHECK_URL:-}"
HEALTH_TOKEN="${HEALTH_CHECK_TOKEN:-}"

on_exit() {
  local code=$?
  if [[ $code -ne 0 ]]; then
    echo "[update-host] FAILED (exit ${code})"
  fi
}
trap on_exit EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull)
      RUN_PULL=false
      shift
      ;;
    --no-migrate)
      RUN_MIGRATE=false
      shift
      ;;
    --no-build-gate)
      RUN_BUILD_GATE=false
      shift
      ;;
    --health-url)
      HEALTH_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./deploy/update-host.sh [options]

Options:
  --no-pull         Skip git pull
  --no-migrate      Skip prisma migrate deploy
  --no-build-gate   Skip pre-deploy docker build check
  --health-url URL  Check health endpoint after deploy
  -h, --help        Show this help
EOF
      exit 0
      ;;
    *)
      echo "[update-host] unknown option: $1" >&2
      exit 1
      ;;
  esac
done

cd "${PROJECT_ROOT}"

echo "[update-host] project root: ${PROJECT_ROOT}"
echo "[update-host] started at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "${DEPLOY_BRANCH}" ]]; then
  echo "[update-host] deployments are allowed only from '${DEPLOY_BRANCH}' branch (current: ${CURRENT_BRANCH})." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "[update-host] working tree is not clean. Commit/stash local changes first." >&2
  exit 1
fi

git fetch --all --prune

UPSTREAM_REF="origin/${DEPLOY_BRANCH}"
if ! git show-ref --verify --quiet "refs/remotes/${UPSTREAM_REF}"; then
  echo "[update-host] upstream branch not found: ${UPSTREAM_REF}" >&2
  exit 1
fi

read -r BEHIND_COUNT AHEAD_COUNT <<<"$(git rev-list --left-right --count HEAD...${UPSTREAM_REF})"

if (( AHEAD_COUNT > 0 )); then
  echo "[update-host] local branch is ahead of ${UPSTREAM_REF} by ${AHEAD_COUNT} commit(s)." >&2
  echo "[update-host] push commits to GitHub first, then run update-host.sh again." >&2
  exit 1
fi

if [[ "${RUN_PULL}" == "true" ]]; then
  echo "[update-host] pulling latest changes for branch: ${DEPLOY_BRANCH}"
  git pull --ff-only origin "${DEPLOY_BRANCH}"
else
  if (( BEHIND_COUNT > 0 )); then
    echo "[update-host] skipping git pull (branch is behind ${UPSTREAM_REF} by ${BEHIND_COUNT} commit(s))"
  else
    echo "[update-host] skipping git pull"
  fi
fi

echo "[update-host] deploy commit: $(git rev-parse --short HEAD)"

if [[ "${RUN_BUILD_GATE}" == "true" ]]; then
  echo "[update-host] pre-deploy build gate (docker compose build app)"
  docker compose -f "${COMPOSE_FILE}" build app
else
  echo "[update-host] skipping pre-deploy build gate"
fi

echo "[update-host] rebuilding and restarting containers"
docker compose -f "${COMPOSE_FILE}" up -d --no-build

if [[ "${RUN_MIGRATE}" == "true" ]]; then
  echo "[update-host] running prisma migrate deploy"
  docker compose -f "${COMPOSE_FILE}" exec -T app npm run prisma:migrate:deploy
else
  echo "[update-host] skipping migrations"
fi

echo "[update-host] service status"
docker compose -f "${COMPOSE_FILE}" ps

if [[ -n "${HEALTH_URL}" ]]; then
  if command -v curl >/dev/null 2>&1; then
    echo "[update-host] health check: ${HEALTH_URL}"
    if [[ -n "${HEALTH_TOKEN}" ]]; then
      curl -fsS -H "x-health-secret: ${HEALTH_TOKEN}" "${HEALTH_URL}" >/dev/null
    else
      curl -fsS "${HEALTH_URL}" >/dev/null
    fi
    echo "[update-host] health check OK"
  else
    echo "[update-host] curl not found; skipping health check"
  fi
fi

echo "[update-host] done"
echo "[update-host] finished at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
