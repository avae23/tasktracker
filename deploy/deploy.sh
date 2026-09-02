#!/usr/bin/env bash
# Выкладка трекера на сервер с nginx.
#
#   bash deploy.sh /tmp/tracker-dist.tar.gz            — выложить
#   DRY_RUN=1 bash deploy.sh /tmp/tracker-dist.tar.gz  — только показать план
#
# Главное правило: соседние сайты должны пережить выкладку.
# Скрипт останавливается при первой же странности и откатывает свои изменения.
#
#   1. отказывается работать, если конфигурация nginx сломана ДО нас;
#   2. делает полную копию /etc/nginx перед любым изменением;
#   3. запоминает, какие сайты сейчас отвечают, и проверяет их после перезагрузки;
#   4. если хоть один перестал отвечать — возвращает конфигурацию и перезагружает обратно;
#   5. не трогает чужие файлы и чужой каталог с сайтом.

set -euo pipefail

DOMAIN="${DOMAIN:-tracker.avdeevalexandr.ru}"
ROOT="${ROOT:-/var/www/tracker}"
ARCHIVE="${1:-/tmp/tracker-dist.tar.gz}"
DRY_RUN="${DRY_RUN:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/root/nginx-backup-$STAMP"
MARKER=".tracker-deploy"

say()  { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
run()  { if [ -n "$DRY_RUN" ]; then printf '  [dry-run] %s\n' "$*"; else eval "$@"; fi; }

# ---------------------------------------------------------------- проверки
[ "$(id -u)" = "0" ] || die "нужен root: sudo bash $0 $*"
[ -f "$ARCHIVE" ]    || die "нет архива со сборкой: $ARCHIVE"
[ -f "$HERE/nginx-tracker.conf" ] || die "рядом со скриптом нет nginx-tracker.conf"
command -v nginx >/dev/null || die "nginx не найден. Если сайты отдаёт другой сервер (apache, caddy, docker) — остановитесь и скажите, соберу конфиг под него."

say "Проверяю, что конфигурация nginx исправна ДО изменений"
if ! nginx -t 2>&1 | sed 's/^/  /'; then
  die "nginx -t не проходит уже сейчас. Это не связано с трекером — разберитесь с этим отдельно, я ничего не менял."
fi

# ------------------------------------------------- какие сайты живы сейчас
# Ходим на localhost с нужным Host — так проверяется именно nginx,
# независимо от внешнего файрвола и DNS.
mapfile -t SITES < <(
  grep -rhoP '^\s*server_name\s+\K[^;]+' /etc/nginx 2>/dev/null \
    | tr ' ' '\n' | grep -v '^_$' | grep -v '^\s*$' | grep -v '^\*' | sort -u
)

probe() { curl -s -o /dev/null -w '%{http_code}' -m 5 -H "Host: $1" http://127.0.0.1/ 2>/dev/null || echo "000"; }

say "Запоминаю, как сейчас отвечают сайты"
declare -A BEFORE
if [ ${#SITES[@]} -eq 0 ]; then
  info "именованных сайтов в конфиге не нашлось"
else
  for s in "${SITES[@]}"; do
    BEFORE["$s"]="$(probe "$s")"
    info "$s → ${BEFORE[$s]}"
  done
fi

# ------------------------------------------------------------------ файлы
say "Готовлю каталог $ROOT"
if [ -d "$ROOT" ] && [ ! -f "$ROOT/$MARKER" ] && [ -n "$(ls -A "$ROOT" 2>/dev/null)" ]; then
  die "каталог $ROOT уже занят чужими файлами (нет метки $MARKER). Останавливаюсь, чтобы ничего не затереть. Задайте другой: ROOT=/var/www/tracker2 bash $0 $ARCHIVE"
fi

run "rm -rf '$ROOT.new'"
run "mkdir -p '$ROOT.new'"
run "tar -xzf '$ARCHIVE' -C '$ROOT.new'"
if [ -z "$DRY_RUN" ]; then
  [ -f "$ROOT.new/index.html" ] || die "в архиве нет index.html — похоже, собралось не то"
  date -Iseconds > "$ROOT.new/$MARKER"
fi

if [ -d "$ROOT" ]; then
  run "rm -rf '$ROOT.old'"
  run "mv '$ROOT' '$ROOT.old'"
  info "предыдущая версия сохранена в $ROOT.old"
fi
run "mv '$ROOT.new' '$ROOT'"
run "chown -R www-data:www-data '$ROOT' 2>/dev/null || chown -R nginx:nginx '$ROOT' 2>/dev/null || true"
run "find '$ROOT' -type d -exec chmod 755 {} +"
run "find '$ROOT' -type f -exec chmod 644 {} +"

# ------------------------------------------------------------- конфиг сайта
if [ -d /etc/nginx/sites-available ]; then
  CONF="/etc/nginx/sites-available/$DOMAIN"
  LINK="/etc/nginx/sites-enabled/$DOMAIN"
else
  CONF="/etc/nginx/conf.d/$DOMAIN.conf"
  LINK=""
fi

OTHER="$(grep -rl "server_name[^;]*\b$DOMAIN\b" /etc/nginx 2>/dev/null | grep -v "^$CONF\$" || true)"
if [ -n "$OTHER" ]; then
  say "Конфиг не трогаю"
  info "$DOMAIN уже описан в:"
  echo "$OTHER" | sed 's/^/    /'
  info "обновил только файлы в $ROOT — конфигурацию оставил вашу"
  say "Готово"
  echo "  http://$DOMAIN"
  exit 0
fi

say "Делаю копию конфигурации в $BACKUP"
run "cp -a /etc/nginx '$BACKUP'"

say "Ставлю конфиг $CONF"
run "install -m 644 '$HERE/nginx-tracker.conf' '$CONF'"
[ -n "$LINK" ] && run "ln -sfn '$CONF' '$LINK'"

if [ -n "$DRY_RUN" ]; then
  say "Это был dry-run — на сервере ничего не изменилось"
  exit 0
fi

restore() {
  printf '\n\033[33m  возвращаю конфигурацию из %s\033[0m\n' "$BACKUP"
  rm -rf /etc/nginx
  cp -a "$BACKUP" /etc/nginx
  systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
}

say "Проверяю конфигурацию"
if ! nginx -t 2>&1 | sed 's/^/  /'; then
  restore
  die "nginx -t не прошёл. Конфигурация возвращена, сайты не тронуты."
fi

say "Перезагружаю nginx"
systemctl reload nginx || service nginx reload || { restore; die "не удалось перезагрузить nginx. Конфигурация возвращена."; }
sleep 2

# ------------------------------------------------ не сломались ли соседи
say "Проверяю, что прежние сайты отвечают как раньше"
BROKEN=""
for s in "${SITES[@]:-}"; do
  [ -z "$s" ] && continue
  was="${BEFORE[$s]}"
  now="$(probe "$s")"
  info "$s: было $was → стало $now"
  # ругаемся только если сайт работал, а теперь молчит
  if [ "$was" != "000" ] && [ "$now" = "000" ]; then
    BROKEN="$BROKEN $s"
  fi
done

if [ -n "$BROKEN" ]; then
  restore
  die "перестали отвечать:$BROKEN — всё возвращено, разбираемся до повторной попытки."
fi

now_tracker="$(probe "$DOMAIN")"
say "Готово"
info "$DOMAIN отвечает: $now_tracker"
info "http://$DOMAIN"
echo ""
info "копия конфигурации: $BACKUP"
info "прошлая версия файлов: $ROOT.old"
echo ""
echo "  HTTPS (если стоит certbot):"
echo "    certbot --nginx -d $DOMAIN"
echo ""
echo "  Полный откат:"
echo "    rm -rf /etc/nginx && cp -a $BACKUP /etc/nginx && systemctl reload nginx"
