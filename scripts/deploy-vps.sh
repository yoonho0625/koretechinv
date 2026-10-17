#!/usr/bin/env bash
# ============================================================
# 국내 VPS 배포 — PC 에서 빌드해서 올리고 서비스를 다시 띄운다
#   npm run deploy
# 서버 주소는 .deploy.env 의 KT_SSH (예: root@123.45.67.89) — 저장소에 올리지 않는다.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .deploy.env ] && . ./.deploy.env
: "${KT_SSH:?.deploy.env 에 KT_SSH=root@서버IP 를 적으세요}"
SSH_OPTS=${KT_SSH_OPTS:-"-o StrictHostKeyChecking=accept-new"}

echo "== 빌드 (Node)"
rm -rf dist
SITE_URL="${SITE_URL:-https://www.koretechinv.com}" KT_HOSTS="${KT_HOSTS:-}" npx astro build >/dev/null

echo "== 묶기"
TAR=$(mktemp -t koretech-XXXX).tgz
tar -czf "$TAR" dist migrations package.json package-lock.json

echo "== 올리기"
scp $SSH_OPTS "$TAR" "$KT_SSH:/tmp/koretech.tgz"
ssh $SSH_OPTS "$KT_SSH" 'set -e
  cd /opt/koretech
  rm -rf dist.new && mkdir dist.new && tar -xzf /tmp/koretech.tgz -C dist.new
  cp dist.new/package.json dist.new/package-lock.json .
  rm -rf migrations && mv dist.new/migrations .
  npm ci --omit=dev --no-audit --no-fund >/dev/null
  rm -rf dist.old && [ -d dist ] && mv dist dist.old || true
  mv dist.new/dist dist && rm -rf dist.new /tmp/koretech.tgz
  chown -R koretech:koretech /opt/koretech
  systemctl restart koretech
  sleep 2
  systemctl is-active koretech
  curl -s -o /dev/null -w "서버 내부 확인 %{http_code}\n" http://127.0.0.1:4321/'
rm -f "$TAR"
echo "== 배포 끝"
