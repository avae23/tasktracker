#!/usr/bin/env bash
# Раскладывает трекер на сервер и включает для него отдельный сайт в nginx.
# Запускать НА СЕРВЕРЕ от root:
#     bash deploy.sh /tmp/tracker-dist.tar.gz
#
# Чужие конфиги скрипт не трогает: создаёт только свой файл, а перед
# перезагрузкой nginx проверяет конфигурацию и откатывается, если она сломалась.

set -euo pipefail

DOMAIN="${DOMAIN:-tracker.avdeevalexandr.ru}"
ROOT="${ROOT:-/var/www/tracker}"
ARCHIVE="${1:-/tmp/tracker-dist.tar.gz}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
die() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "нужен root: sudo bash $0 $*"
[ -f "$ARCHIVE" ] || die "нет архива со сборкой: $ARCHIVE"
command -v nginx >/dev/null || die "nginx не найден. Если сайт отдаёт что-то другое (apache, caddy, docker) — скажите, соберу конфиг под него."

# ---------- 1. файлы ----------
say "Распаковываю сборку в $ROOT"
rm -rf "$ROOT.new"
mkdir -p "$ROOT.new"
tar -xzf "$ARCHIVE" -C "$ROOT.new"
[ -f "$ROOT.new/index.html" ] || die "в архиве нет index.html — похоже, собралось не то"

if [ -d "$ROOT" ]; then
  rm -rf "$ROOT.old"
  mv "$ROOT" "$ROOT.old"
  echo "  предыдущая версия сохранена в $ROOT.old"
fi
mv "$ROOT.new" "$ROOT"
chown -R www-data:www-data "$ROOT" 2>/dev/null || chown -R nginx:nginx "$ROOT" 2>/dev/null || true
find "$ROOT" -type d -exec chmod 755 {} + && find "$ROOT" -type f -exec chmod 644 {} +

# ---------- 2. конфиг nginx ----------
if [ -d /etc/nginx/sites-available ]; then
  CONF="/etc/nginx/sites-available/$DOMAIN"
  LINK="/etc/nginx/sites-enabled/$DOMAIN"
else
  CONF="/etc/nginx/conf.d/$DOMAIN.conf"
  LINK=""
fi

# не наступаем на чужой сайт с тем же именем
EXISTING="$(grep -rl "server_name[^;]*\b$DOMAIN\b" /etc/nginx 2>/dev/null | grep -v "^$CONF$" || true)"
if [ -n "$EXISTING" ]; then
  echo "  внимание: $DOMAIN уже упоминается в:"
  echo "$EXISTING" | sed 's/^/    /'
  echo "  оставляю как есть, только обновил файлы в $ROOT"
else
  say "Ставлю конфиг $CONF"
  CREATED=""
  if [ -f "$CONF" ]; then
    cp -a "$CONF" "$CONF.bak.$(date +%Y%m%d%H%M%S)"
    echo "  старый конфиг сохранён рядом с суффиксом .bak"
  else
    CREATED="yes"
  fi
  install -m 644 "$HERE/nginx-tracker.conf" "$CONF"
  [ -n "$LINK" ] && ln -sfn "$CONF" "$LINK"

  say "Проверяю конфигурацию nginx"
  if ! nginx -t; then
    echo "  конфигурация сломалась — откатываю, ничего не перезагружаю"
    [ -n "$LINK" ] && rm -f "$LINK"
    [ -n "$CREATED" ] && rm -f "$CONF"
    die "nginx -t не прошёл. Остальные сайты не тронуты."
  fi

  say "Перезагружаю nginx"
  systemctl reload nginx || service nginx reload
fi

say "Готово"
echo "  http://$DOMAIN"
echo ""
echo "  HTTPS одной командой (если стоит certbot):"
echo "    certbot --nginx -d $DOMAIN"
echo ""
echo "  Откатиться на прошлую версию:"
echo "    rm -rf $ROOT && mv $ROOT.old $ROOT && systemctl reload nginx"
