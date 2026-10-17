#!/usr/bin/env bash
# ============================================================
# 카페24 가상서버(Ubuntu 24.04) 최초 1회 설치
#   실행: 서버에 root 로 접속해서  bash setup-server.sh <도메인> <관리자메일>
#   예:   bash setup-server.sh www.koretechinv.com yoonho@zoopiter.co.kr
#
# 하는 일: Node 22 · nginx · certbot · 방화벽 · 서비스 계정 · systemd · 매일 백업
# 여러 번 돌려도 안전하다(이미 된 것은 건너뛴다).
# ============================================================
set -euo pipefail
DOMAIN="${1:?도메인을 넣으세요 (예: www.koretechinv.com)}"
EMAIL="${2:?인증서 알림 받을 메일을 넣으세요}"
APP=/opt/koretech
DATA=/var/lib/koretech

echo "== 패키지"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates nginx sqlite3 ufw certbot python3-certbot-nginx rsync
if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "== 계정·폴더"
id koretech >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin koretech
mkdir -p "$APP" "$DATA/files" "$DATA/backup"
chown -R koretech:koretech "$APP" "$DATA"
chmod 750 "$DATA"

echo "== 비밀값 (세션 서명 키 — 처음 한 번만 만든다)"
if [ ! -f /etc/koretech.env ]; then
  umask 077
  cat > /etc/koretech.env <<EOF
HOST=127.0.0.1
PORT=4321
NODE_ENV=production
KT_DB_PATH=$DATA/koretech.db
KT_FILES_DIR=$DATA/files
KT_CLIENT_DIR=$APP/dist/client
KT_MIGRATIONS_DIR=$APP/migrations
SESSION_SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '/+=\n' | cut -c1-60)
EOF
  chown root:koretech /etc/koretech.env
  chmod 640 /etc/koretech.env
fi

echo "== systemd"
cat > /etc/systemd/system/koretech.service <<'EOF'
[Unit]
Description=KoreTech Investment website (Astro Node)
After=network.target

[Service]
Type=simple
User=koretech
Group=koretech
WorkingDirectory=/opt/koretech
EnvironmentFile=/etc/koretech.env
ExecStart=/usr/bin/node /opt/koretech/dist/server/entry.mjs
Restart=always
RestartSec=3
# 보안
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/koretech
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable koretech >/dev/null

echo "== nginx"
APEX="${DOMAIN#www.}"
cat > /etc/nginx/sites-available/koretech <<EOF
# 첨부 30MB + 여유
client_max_body_size 64m;

upstream koretech_app { server 127.0.0.1:4321; keepalive 16; }

server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN $APEX;

  gzip on;
  gzip_comp_level 6;
  gzip_types text/css application/javascript application/json image/svg+xml text/plain application/xml;

  root $APP/dist/client;

  # 빌드 결과물(파일명에 해시가 붙음) — 1년 캐시
  location /_astro/ { access_log off; expires 1y; add_header Cache-Control "public, max-age=31536000, immutable"; try_files \$uri =404; }
  location /brand/  { access_log off; expires 30d; try_files \$uri =404; }

  # 정적 페이지는 nginx 가 바로, 없으면 Node 로
  location / {
    try_files \$uri \$uri/index.html @app;
  }

  location @app {
    proxy_pass http://koretech_app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header CF-Connecting-IP \$remote_addr;
    proxy_read_timeout 60s;
  }

  # 관리자·첨부·공지·메인은 항상 Node (DB 를 읽는다)
  location ~ ^/(admin|files|notice|portfolio)(/|$) { try_files /__never__ @app; }
  location = / { try_files /__never__ @app; }

  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
}
EOF
ln -sf /etc/nginx/sites-available/koretech /etc/nginx/sites-enabled/koretech
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== 방화벽"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
yes | ufw enable >/dev/null || true

echo "== 매일 백업 (DB + 첨부, 14일 보관) — 03:30"
cat > /usr/local/bin/koretech-backup <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
D=/var/lib/koretech; T=$(date +%Y%m%d-%H%M)
sqlite3 "$D/koretech.db" ".backup '$D/backup/db-$T.sqlite'"
tar -czf "$D/backup/files-$T.tgz" -C "$D" files
find "$D/backup" -type f -mtime +14 -delete
EOF
chmod 755 /usr/local/bin/koretech-backup
echo "30 3 * * * koretech /usr/local/bin/koretech-backup" > /etc/cron.d/koretech-backup

echo "== HTTPS (도메인이 이 서버를 가리킨 뒤에만 성공한다)"
if certbot --nginx -n --agree-tos -m "$EMAIL" -d "$DOMAIN" -d "$APEX" --redirect; then
  echo "HTTPS 완료 (자동 갱신은 certbot 타이머가 한다)"
else
  echo "!! HTTPS 보류 — DNS 가 아직 이 서버를 가리키지 않습니다. 연결 후: certbot --nginx -d $DOMAIN -d $APEX --redirect"
fi

echo "== 끝. 다음: PC 에서 npm run deploy"
