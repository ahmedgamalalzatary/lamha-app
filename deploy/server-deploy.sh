#!/bin/sh
# Runs on the server, from deploy/deploy.sh: `sh deploy/server-deploy.sh <tag> <domain>`.
# Build both images, back up, migrate, start the API, start the dashboard; roll back what is not
# healthy. It only ever acts on Wassal's compose project.
#
# Order: both images are built before anything running changes, so a failed build changes nothing.
# Migrations must stay backward-compatible with the previous API image: add tables and columns
# first; renaming or dropping waits for the deploy after the code that stops using them is live.
# A failed migration leaves the old API running (a half-applied one is retried by the next run);
# an unhealthy new API or dashboard is rolled back to its previous image.
#
# Backup: the database is dumped right before the migrations to
# /root/tawsela-backups/pre-deploy-<tag>.sql.gz. deploy.sh deletes it only after the whole deploy is
# green; a failed deploy keeps it for a restore. Uploaded photos are not copied: no migration
# touches them, and they never leave /srv/tawsela/uploads.
set -eu
TAG="${1:?usage: server-deploy.sh <tag> <domain>}"
DOMAIN="${2:?usage: server-deploy.sh <tag> <domain>}"
SRC=/root/tawsela
COMPOSE="docker compose -f $SRC/docker-compose.yml"
BACKUP_DIR=/root/tawsela-backups
BACKUP="$BACKUP_DIR/pre-deploy-$TAG.sql.gz"
PREVIOUS_API="$(docker inspect --format '{{.Config.Image}}' tawsela-api 2>/dev/null || true)"
PREVIOUS_WEB="$(docker inspect --format '{{.Config.Image}}' tawsela-web 2>/dev/null || true)"
STEP=start

# Whatever goes wrong, say where, so the person (or agent) reading the log knows what to look at.
report() {
  code=$?
  [ "$code" -eq 0 ] && return
  echo "" >&2
  echo "SERVER STEP FAILED: $STEP (exit $code)" >&2
  case "$STEP" in
    env) echo "Nothing changed on the server." >&2 ;;
    build) echo "Nothing changed on the server: the old API and dashboard are still running." >&2 ;;
    backup) echo "No migration ran; the old API and dashboard are still running." >&2 ;;
    migrate) echo "The old API is still running. The database may be half-migrated; the next deploy retries it." >&2 ;;
    api) echo "The new API never became healthy; it was rolled back to ${PREVIOUS_API:-nothing (no previous image)}." >&2 ;;
    web) echo "The new API is live; the new dashboard never became healthy and was rolled back to ${PREVIOUS_WEB:-nothing (no previous image)}." >&2 ;;
  esac
  if [ -f "$BACKUP" ]; then
    echo "The database backup taken before the migration is kept: $BACKUP" >&2
    echo "Restore it with: gunzip -c $BACKUP | docker exec -i tawsela-mysql sh -c 'MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot \"\$MYSQL_DATABASE\"'" >&2
  fi
}
trap report EXIT

# The API refuses to start in production without a mail server; say so before building anything.
STEP=env
for key in SMTP_HOST SMTP_USER SMTP_PASS; do
  if ! grep -q "^$key=." "$SRC/.env.production"; then
    echo "$key is empty in $SRC/.env.production: fill it in first (the API needs it in production)" >&2
    exit 1
  fi
done

STEP=build
# Docker's own builder: the images land in Docker directly (no export and import), and the package
# and Next.js caches stay between deploys. The dashboard reuses the API build's install.
echo "== Building tawsela-api:$TAG and tawsela-web:$TAG"
started=$(date +%s)
docker build --target api -t "tawsela-api:$TAG" "$SRC"
docker build --target web -t "tawsela-web:$TAG" --build-arg "NEXT_PUBLIC_API_URL=https://api.$DOMAIN/v1" "$SRC"
echo "Built both images in $(( $(date +%s) - started ))s"

export TAWSELA_API_TAG="$TAG" TAWSELA_WEB_TAG="$TAG"
STEP=database
echo "== Starting the database"
$COMPOSE up -d --wait mysql

# The dump runs inside the database container with its own root password; nothing is printed.
# A dump is trusted only if gzip reads it back and mysqldump wrote its closing line.
STEP=backup
echo "== Backing up the database to $BACKUP"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
rm -f "$BACKUP.part"
docker exec tawsela-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' > "$BACKUP.sql.part"
gzip -c "$BACKUP.sql.part" > "$BACKUP.part"
rm -f "$BACKUP.sql.part"
if ! gzip -t "$BACKUP.part" || ! gunzip -c "$BACKUP.part" | tail -n 1 | grep -q 'Dump completed'; then
  rm -f "$BACKUP.part"
  echo "The database dump is incomplete" >&2
  exit 1
fi
mv "$BACKUP.part" "$BACKUP"
echo "Backup ready ($(du -h "$BACKUP" | cut -f1))"

# A failed migration stops here, and the old API keeps running.
STEP=migrate
echo "== Running migrations"
$COMPOSE run --rm --no-deps -T api node dist/core/db/run-migrations.js

# Starts one service and waits for its health check; rolls it back to its previous image if not.
# $1 service, $2 tag variable, $3 previous image.
start() {
  if ! $COMPOSE up -d --no-deps --wait --wait-timeout 90 "$1"; then
    echo "The new $1 is not healthy. Its last health checks:" >&2
    docker inspect --format '{{range .State.Health.Log}}{{.ExitCode}} {{.Output}}{{end}}' "tawsela-$1" >&2 || true
    echo "Its last log lines:" >&2
    $COMPOSE logs --no-color --tail 60 "$1" >&2 || true
    if [ -n "$3" ] && docker image inspect "$3" >/dev/null 2>&1; then
      echo "Rolling back to $3" >&2
      env "$2=${3#*:}" $COMPOSE up -d --no-deps "$1"
    fi
    exit 1
  fi
}

STEP=api
echo "== Starting the new API"
start api TAWSELA_API_TAG "$PREVIOUS_API"

STEP=web
echo "== Starting the new dashboard"
start web TAWSELA_WEB_TAG "$PREVIOUS_WEB"

STEP=done
echo "Deployed tawsela-api:$TAG and tawsela-web:$TAG"
