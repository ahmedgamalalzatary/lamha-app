#!/bin/sh
# One-time setup on the server, safe to run again: `sh deploy/setup-server.sh <domain>`, run by
# `sh deploy/deploy.sh --setup`. It adds only Wassal's own folders, secrets, build helper and site.
# The API answers at api.<domain>, the dashboard at admin.<domain> (like Tawsilty's admin.* host).
set -eu
DOMAIN="${1:?usage: setup-server.sh <domain>}"
API_HOST="api.$DOMAIN"
ADMIN_HOST="admin.$DOMAIN"
SRC=/root/tawsela

mkdir -p /srv/tawsela/uploads /var/www/tawsela-acme
chown -R 1000:1000 /srv/tawsela/uploads   # the "node" user in the API image
chmod 755 /srv/tawsela /srv/tawsela/uploads
chmod 700 "$SRC"

# Secrets are made here and stay here. They are never printed.
ENV_FILE="$SRC/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  db_password="$(openssl rand -hex 24)"
  touch "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  cat > "$ENV_FILE" <<EOF
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
MYSQL_DATABASE=tawsela
MYSQL_USER=tawsela
MYSQL_PASSWORD=$db_password
DATABASE_URL=mysql://tawsela:$db_password@mysql:3306/tawsela
JWT_ACCESS_SECRET=$(openssl rand -hex 48)
CORS_ORIGINS=https://$ADMIN_HOST
# Required: the API refuses to start in production without a mail server (codes are emailed).
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
# Optional: only when push security is on in the Expo project.
EXPO_ACCESS_TOKEN=
EOF
  echo "Created $ENV_FILE: fill SMTP_HOST, SMTP_USER and SMTP_PASS in it before the first deploy"
fi

# Installs a site file; a config nginx refuses is taken out again, so nginx stays up.
install_site() {
  ln -sf "$1" /etc/nginx/sites-enabled/zz-tawsela
  if ! nginx -t 2>/dev/null; then
    rm -f /etc/nginx/sites-enabled/zz-tawsela
    nginx -t
    echo "nginx refused the Wassal site; removed it" >&2
    exit 1
  fi
  systemctl reload nginx
}

if [ ! -f "/etc/letsencrypt/live/$API_HOST/fullchain.pem" ]; then
  # Port 80 only, just long enough to prove both names for the certificate.
  cat > /etc/nginx/sites-available/tawsela-acme <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $API_HOST $ADMIN_HOST;
    location /.well-known/acme-challenge/ { root /var/www/tawsela-acme; }
    location / { return 404; }
}
EOF
  install_site /etc/nginx/sites-available/tawsela-acme
  certbot certonly --webroot -w /var/www/tawsela-acme -d "$API_HOST" -d "$ADMIN_HOST" --cert-name "$API_HOST" \
    --non-interactive --agree-tos --register-unsafely-without-email --deploy-hook 'nginx -t && systemctl reload nginx'
fi
sed "s/__DOMAIN__/$DOMAIN/g" "$SRC/deploy/nginx-tawsela.conf" > /etc/nginx/sites-available/tawsela
install_site /etc/nginx/sites-available/tawsela
rm -f /etc/nginx/sites-available/tawsela-acme

echo "Server ready"
