#!/bin/sh
# Deploys the API and the dashboard from this PC: `sh deploy/deploy.sh` (add `--setup` the first time).
# The server keeps a Git clone of this repo and builds exactly the commit that is on origin/main,
# so what runs can always be traced to a commit. The repo is public, so no key is left there.
#
# Where to deploy comes from .env.deploy at the repo root (git-ignored), so the server, the SSH key
# and the domain never go into the repo. It holds three lines:
#   DEPLOY_SERVER=user@address
#   DEPLOY_SSH_KEY=path to the private key that opens it
#   DEPLOY_DOMAIN=the domain (the API answers at api.<domain>, the dashboard at admin.<domain>;
#                 both names must point at the server before the first --setup)
#
# Everything it prints also goes to .dev-logs/deploy.log. A failed deploy ends with a
# "DEPLOY FAILED" block naming the step, the reason, what is still running and where the backup is.
# The database backup the server takes before migrating is deleted only when every step and the
# final live check are green.
set -eu
cd "$(git rev-parse --show-toplevel)"

if [ ! -f .env.deploy ]; then
  echo "Missing .env.deploy at the repo root: see the top of deploy/deploy.sh for its three lines." >&2
  exit 1
fi
. ./.env.deploy
: "${DEPLOY_SERVER:?set DEPLOY_SERVER in .env.deploy}" "${DEPLOY_SSH_KEY:?set DEPLOY_SSH_KEY in .env.deploy}" "${DEPLOY_DOMAIN:?set DEPLOY_DOMAIN in .env.deploy}"
REPO=https://github.com/ahmedgamalalzatary/lamha-app.git
DIR=/root/tawsela
SSH="ssh -i $DEPLOY_SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes $DEPLOY_SERVER"
LOG=.dev-logs/deploy.log

# Run once more with the output copied to the log; the inner run's exit code comes back by file,
# since a pipe in sh only reports tee's.
if [ -z "${TAWSELA_DEPLOY_INNER:-}" ]; then
  mkdir -p .dev-logs
  rm -f "$LOG.status"
  TAWSELA_DEPLOY_INNER=1 sh deploy/deploy.sh "$@" 2>&1 | tee "$LOG"
  exit "$(cat "$LOG.status" 2>/dev/null || echo 1)"
fi

STEP=checks
BACKUP=
finish() {
  code=$?
  echo "$code" > "$LOG.status"
  [ "$code" -eq 0 ] && return
  echo ""
  echo "DEPLOY FAILED at step: $STEP (exit $code)"
  case "$STEP" in
    checks) echo "Nothing was sent to the server." ;;
    checkout) echo "The server's clone may be on the new commit, but nothing was built or restarted." ;;
    setup) echo "The server setup stopped (see above); nothing was built or restarted." ;;
    server) echo "See the SERVER STEP FAILED block above for what the server did and what still runs." ;;
    nginx) echo "The new API and dashboard are live; nginx refused the new site, so the old one stays." ;;
    live-check) echo "Every step ran, but the live check through nginx failed (see above)." ;;
  esac
  [ -z "$BACKUP" ] || echo "Database backup kept on the server: $BACKUP (if the server got as far as taking it)"
  echo "Full log: $LOG"
}
trap finish EXIT

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit your changes first: a deploy is always a pushed commit." >&2
  exit 1
fi
git fetch -q origin main
COMMIT="$(git rev-parse HEAD)"
TAG="$(git rev-parse --short HEAD)"
if [ "$COMMIT" != "$(git rev-parse origin/main)" ]; then
  echo "HEAD is not origin/main. Push it first." >&2
  exit 1
fi
BACKUP="/root/tawsela-backups/pre-deploy-$TAG.sql.gz"
echo "== Deploying $TAG"

# The project is the folder itself. .env.production sits in it too: Git ignores it, so it stays.
STEP=checkout
$SSH "set -eu
  mkdir -p $DIR
  cd $DIR
  if [ ! -d .git ]; then git init -q; git remote add origin $REPO; fi
  git fetch -q origin main
  git checkout -q --force --detach $COMMIT"

if [ "${1:-}" = "--setup" ]; then
  STEP=setup
  $SSH "sh $DIR/deploy/setup-server.sh $DEPLOY_DOMAIN"
fi

# Build, back up, migrate, start and health-check, with rollback (deploy/server-deploy.sh).
STEP=server
$SSH "sh $DIR/deploy/server-deploy.sh $TAG $DEPLOY_DOMAIN"

# The site, only when this commit changed it. A broken file would take nginx down, so the new
# file must pass nginx -t before any reload; if it does not, the previous file is put back.
STEP=nginx
$SSH "set -eu
  LIVE=/etc/nginx/sites-available/tawsela
  sed 's/__DOMAIN__/$DEPLOY_DOMAIN/g' $DIR/deploy/nginx-tawsela.conf > \"\$LIVE.new\"
  if cmp -s \"\$LIVE.new\" \"\$LIVE\"; then
    rm -f \"\$LIVE.new\"
  else
    [ ! -f \"\$LIVE\" ] || cp \"\$LIVE\" \"\$LIVE.previous\"
    mv \"\$LIVE.new\" \"\$LIVE\"
    if nginx -t 2>/dev/null; then
      systemctl reload nginx
      rm -f \"\$LIVE.previous\"
      echo 'nginx: site updated'
    else
      if [ -f \"\$LIVE.previous\" ]; then mv \"\$LIVE.previous\" \"\$LIVE\"; else rm -f \"\$LIVE\"; fi
      nginx -t
      echo 'nginx refused the new site; the previous one is back and nothing was reloaded' >&2
      exit 1
    fi
  fi"

# The live check goes through nginx from outside, as a phone or a browser would.
STEP=live-check
echo "== Checking the live site"
for url in "https://api.$DEPLOY_DOMAIN/v1/health" "https://admin.$DEPLOY_DOMAIN/sign-in"; do
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url" || echo 000)"
  echo "$status $url"
  if [ "$status" != 200 ]; then
    echo "$url answered $status, not 200" >&2
    exit 1
  fi
done

# Green: the backup is not needed any more.
STEP=cleanup
$SSH "rm -f $BACKUP"
echo "Backup removed: $BACKUP"
STEP=done
echo "Deployed $COMMIT: the API at api.$DEPLOY_DOMAIN and the dashboard at admin.$DEPLOY_DOMAIN"
