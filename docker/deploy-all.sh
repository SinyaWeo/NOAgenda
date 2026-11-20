#!/usr/bin/env bash
# Deploy every instance listed in docker/instances, one after another, with docker/deploy.sh.
#
#   docker/deploy-all.sh [--dry-run] [image_tag]
#
# Each instance's backend runs its own pending database migrations when it starts, so deploying an instance is
# what migrates its database. deploy.sh backs that instance up first and checks /health afterwards.
#
# The list (INSTANCES_FILE, default docker/instances; copy docker/instances.example) has one instance per line:
#
#   <compose project> <env file>        # an env file path may be relative to docker/
#
# Blank lines and # comments are ignored. Pass a tag (the 12-character commit SHA CI prints) to put every instance on
# exactly the same version; without one each deploy pulls `latest`, which can move between two deploys.
#
# Stops at the first instance that fails and says which ones are done and which were not touched. That instance has
# been rolled back by deploy.sh, but if the release changed the schema, restore its pre-deploy backup with
# docker/restore.sh before trying again (a failed migration is not undone by the rollback).
# Every env file is checked before anything is deployed, so a typo cannot leave you with half a rollout.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIST="${INSTANCES_FILE:-$HERE/instances}"
DEPLOY="${DEPLOY_SCRIPT:-$HERE/deploy.sh}"
DRY_RUN=0
TAG=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "unknown option: $arg (see --help)" >&2; exit 2 ;;
    *) [ -z "$TAG" ] || { echo "only one image tag can be given" >&2; exit 2; }; TAG="$arg" ;;
  esac
done

[ -f "$LIST" ] || { echo "No instance list at $LIST. Copy docker/instances.example to docker/instances and edit it." >&2; exit 1; }

projects=()
envs=()
while read -r project envfile extra || [ -n "${project:-}" ]; do
  case "${project:-}" in ''|'#'*) continue ;; esac
  [ -n "${envfile:-}" ] && [ -z "${extra:-}" -o "${extra:0:1}" = "#" ] ||
    { echo "$LIST: expected '<compose project> <env file>', got: $project $envfile $extra" >&2; exit 1; }
  case "$envfile" in /*) ;; *) envfile="$HERE/$envfile" ;; esac
  [ -f "$envfile" ] || { echo "$LIST: env file for '$project' not found: $envfile" >&2; exit 1; }
  for seen in "${projects[@]+"${projects[@]}"}"; do
    [ "$seen" != "$project" ] || { echo "$LIST: '$project' is listed twice" >&2; exit 1; }
  done
  projects+=("$project")
  envs+=("$envfile")
done < "$LIST"

[ "${#projects[@]}" -gt 0 ] || { echo "$LIST lists no instances." >&2; exit 1; }

done_list=()
for i in "${!projects[@]}"; do
  project="${projects[$i]}"
  echo "==> [$((i + 1))/${#projects[@]}] $project (${TAG:-latest})"
  if [ "$DRY_RUN" = 1 ]; then
    echo "    COMPOSE_PROJECT=$project ENV_FILE=${envs[$i]} $DEPLOY ${TAG}"
    continue
  fi
  if COMPOSE_PROJECT="$project" ENV_FILE="${envs[$i]}" "$DEPLOY" ${TAG:+"$TAG"}; then
    done_list+=("$project")
  else
    echo >&2
    echo "FAILED: $project" >&2
    echo "  deployed:    ${done_list[*]:-none}" >&2
    echo "  not touched: ${projects[*]:$((i + 1))}" >&2
    echo "  If the release changed the schema, restore $project's pre-deploy backup (docker/restore.sh) before retrying." >&2
    exit 1
  fi
done
[ "$DRY_RUN" = 1 ] || echo "All ${#projects[@]} instances deployed: ${done_list[*]}"
