#!/usr/bin/env bash
# Pre-launch checks for a NOAgenda deployment.
#
#   docker/preflight.sh config [docker/.env.production]    # static checks of your configuration file
#   docker/preflight.sh remote https://noagenda.example.com  # probe the LIVE site from the outside
#   docker/preflight.sh all https://noagenda.example.com     # both
#   add --insecure to `remote` to accept a self-signed certificate (local testing only)
#
# Prints PASS / WARN / FAIL per check; exits 1 if anything FAILs. Run `remote` from a machine that is NOT the
# server (your laptop), otherwise the "ports are closed to the outside" checks prove nothing.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
MODE="${1:-}"; shift || true
fails=0; warns=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; warns=$((warns+1)); }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fails=$((fails+1)); }
section() { printf '\n== %s\n' "$1"; }

# ------------------------------------------------------------------ config
check_config() {
  local file="${1:-$HERE/.env.production}"
  section "Configuration: $file"
  if [ ! -f "$file" ]; then fail "file not found (copy docker/.env.production.example and fill it in)"; return; fi

  val() { grep -E "^$1=" "$file" | tail -1 | cut -d= -f2- | sed -E 's/^["'"'"']|["'"'"']$//g'; }
  weak() { case "${1,,}" in ""|change_me*|changeme*|password*|secret*|example*|test*|admin*|1234*) return 0;; *) return 1;; esac; }

  local perm; perm="$(stat -c %a "$file" 2>/dev/null || echo 000)"
  if [ "${perm: -2}" = "00" ]; then pass "file permissions $perm (only the owner can read it)"; else warn "file permissions are $perm: run chmod 600 $file"; fi
  if git -C "$ROOT" ls-files --error-unmatch "$file" >/dev/null 2>&1; then fail "the secrets file is tracked by git: remove it from the repository and rotate every secret in it"; else pass "secrets file is not tracked by git"; fi

  local d; d="$(val DOMAIN)"
  case "$d" in
    "") fail "DOMAIN is not set" ;;
    localhost|127.*|*.local) warn "DOMAIN is '$d': fine for testing, not for a public server" ;;
    *example.*|*.test|*.invalid) fail "DOMAIN is still a placeholder ('$d')" ;;
    *) pass "DOMAIN = $d" ;;
  esac

  local v
  for k in MYSQL_ROOT_PASSWORD MYSQL_PASSWORD; do
    v="$(val $k)"
    if [ -z "$v" ]; then fail "$k is empty"
    elif weak "$v" || [ "${#v}" -lt 16 ]; then fail "$k is weak or too short (${#v} chars; use 'openssl rand -base64 24')"
    else pass "$k is set (${#v} chars)"; fi
  done
  v="$(val JWT_SECRET)"
  if [ -z "$v" ]; then fail "JWT_SECRET is empty"
  elif weak "$v" || [ "${#v}" -lt 32 ]; then fail "JWT_SECRET is weak or shorter than 32 chars (use 'openssl rand -hex 48')"
  else pass "JWT_SECRET is set (${#v} chars)"; fi
  if [ -n "$(val MYSQL_ROOT_PASSWORD)" ] && [ -n "$(val MYSQL_PASSWORD)" ]; then
    [ "$(val MYSQL_ROOT_PASSWORD)" != "$(val MYSQL_PASSWORD)" ] && pass "database root and app passwords differ" || fail "MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD are identical"
  fi

  # Email
  if [ -z "$(val SMTP_HOST)" ]; then
    fail "SMTP_HOST is not set: password reset cannot send email and email verification is off"
  else
    pass "SMTP_HOST = $(val SMTP_HOST)"
    [ -n "$(val SMTP_USER)" ] && [ -n "$(val SMTP_PASS)" ] || warn "SMTP_USER/SMTP_PASS are empty (fine only for an open relay on a private network)"
    [ -n "$(val MAIL_FROM)" ] || warn "MAIL_FROM is not set (mail will come from no-reply@localhost and be rejected or spam-filtered)"
  fi
  [ "$(val REQUIRE_EMAIL_VERIFICATION)" = "false" ] && warn "REQUIRE_EMAIL_VERIFICATION=false: anyone can register with an address they do not own"

  # Legal
  if [ -z "$(val OPERATOR_NAME)" ] || [ -z "$(val CONTACT_EMAIL)" ]; then fail "OPERATOR_NAME / CONTACT_EMAIL not set: the Terms and Privacy pages will show the 'template' banner"; else pass "operator details set for the legal pages"; fi
  [ "$(val REQUIRE_TERMS_ACCEPTANCE)" = "true" ] && pass "terms acceptance is enforced by the API" || warn "REQUIRE_TERMS_ACCEPTANCE is not 'true' (the UI asks, but the API would accept registrations without it)"

  if [ "$(val REGISTRATION_ENABLED)" = "false" ]; then pass "registration is closed"
  elif [ -n "$(val REGISTRATION_INVITE_CODE)" ]; then pass "registration requires an invite code"
  else warn "registration is open to anyone who finds the site (set REGISTRATION_INVITE_CODE for an invite-only soft launch)"; fi

  local po; po="$(val PUBLIC_ORIGIN)"
  [ -z "$po" ] || case "$po" in https://*) pass "PUBLIC_ORIGIN uses https" ;; *) fail "PUBLIC_ORIGIN must start with https://" ;; esac

  if command -v docker >/dev/null 2>&1; then
    if docker compose -f "$HERE/docker-compose.prod.yml" --env-file "$file" config -q 2>/dev/null; then pass "docker compose accepts the configuration"; else fail "docker compose rejects the configuration (run: docker compose -f docker/docker-compose.prod.yml --env-file $file config)"; fi
  else warn "docker not found here: skipped the compose validation"; fi
}

# ------------------------------------------------------------------ remote
check_remote() {
  local url="${1:-}" insecure=""
  [ "${2:-}" = "--insecure" ] && insecure="-k"
  section "Live site: $url"
  case "$url" in https://*) pass "URL uses https" ;; *) fail "give an https:// URL"; return ;; esac
  local hostport="${url#https://}"; hostport="${hostport%%/*}"
  local host="${hostport%%:*}" port=443; [[ "$hostport" == *:* ]] && port="${hostport##*:}"
  local base="${url%/}"
  C() { curl -sS $insecure -m 15 "$@"; }

  local errf; errf="$(mktemp)"; trap 'rm -f "$errf"' RETURN
  if ! C -o /dev/null "$base/" 2>"$errf"; then
    fail "cannot connect or the certificate is not trusted: $(head -1 "$errf")"; return
  fi
  pass "site reachable${insecure:+ (certificate NOT verified: --insecure)}"

  # TLS certificate lifetime
  if end="$(echo | openssl s_client -connect "$host:$port" -servername "$host" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null)"; then
    if echo | openssl s_client -connect "$host:$port" -servername "$host" 2>/dev/null | openssl x509 -noout -checkend $((14*86400)) >/dev/null 2>&1; then pass "TLS certificate valid for 14+ more days (${end#notAfter=})"; else fail "TLS certificate expires within 14 days (${end#notAfter=}): is automatic renewal working?"; fi
  else warn "could not read the TLS certificate"; fi

  # http -> https redirect (only meaningful on the standard port)
  if [ "$port" = "443" ]; then
    code="$(curl -sS -m 10 -o /dev/null -w '%{http_code} %{redirect_url}' "http://$host/" 2>/dev/null || true)"
    case "$code" in 30[1278]\ https://*) pass "http redirects to https" ;; *) fail "http://$host/ does not redirect to https (got: ${code:-no answer})" ;; esac
  fi

  hdrs="$(C -D - -o /dev/null "$base/user/login" | tr -d '\r')"
  h() { echo "$hdrs" | grep -i "^$1:" | head -1; }
  [ -n "$(h strict-transport-security)" ] && pass "HSTS header present" || fail "no Strict-Transport-Security header"
  [ -n "$(h content-security-policy)" ] && pass "Content-Security-Policy header present" || fail "no Content-Security-Policy header on the UI"
  [ -n "$(h x-content-type-options)" ] && pass "X-Content-Type-Options present" || fail "no X-Content-Type-Options header"
  [ -n "$(h x-frame-options)" ] && pass "X-Frame-Options present" || warn "no X-Frame-Options header"
  [ -n "$(h referrer-policy)" ] && pass "Referrer-Policy present" || warn "no Referrer-Policy header"

  ahdrs="$(C -D - -o /dev/null "$base/api/health" | tr -d '\r')"
  echo "$ahdrs" | grep -qi '^x-powered-by' && fail "API leaks X-Powered-By" || pass "API does not advertise its framework"
  [ "$(C "$base/api/health")" = '{"status":"ok"}' ] && pass "/api/health is ok (database reachable)" || fail "/api/health is not ok"
  # (/api/health is deliberately exempt from throttling, so probe a normal endpoint)
  C -D - -o /dev/null "$base/api/auth/config" | tr -d '\r' | grep -qi '^x-ratelimit-limit' && pass "rate limiting is active" || warn "no rate-limit headers seen on the API"
  [ "$(C -o /dev/null -w '%{http_code}' "$base/api/users/me")" = "401" ] && pass "API rejects unauthenticated requests" || fail "/api/users/me did not answer 401 without a token"
  [ "$(C -o /dev/null -w '%{http_code}' "$base/api/uploads/anything.txt")" = "404" ] && pass "uploaded files are not served publicly" || fail "/api/uploads/... is reachable"
  C "$base/robots.txt" | grep -qi 'disallow: /' && pass "robots.txt keeps crawlers out" || warn "robots.txt does not disallow crawling"

  cfg="$(C "$base/api/auth/config")"
  echo "$cfg" | grep -q '"emailVerificationRequired":true' && pass "email verification is required" || warn "email verification is NOT required (SMTP missing, or turned off)"
  echo "$cfg" | grep -q '"registrationEnabled":false' && pass "registration is closed" || { echo "$cfg" | grep -q '"inviteRequired":true' && pass "registration requires an invite code" || warn "registration is open to anyone"; }
  echo "$cfg" | grep -q '"termsAcceptanceRequired":true' && pass "terms acceptance is enforced by the API" || warn "terms acceptance is not enforced by the API"

  terms="$(C "$base/terms")"
  echo "$terms" | grep -q 'Template, not yet configured' && fail "the Terms page still shows the 'template, not yet configured' banner" || pass "legal pages are configured (no template banner)"
  echo "$terms" | grep -q '\[Operator name and address\]' && fail "the Terms page still contains the operator placeholder" || true
  priv="$(C "$base/privacy")"
  echo "$priv" | grep -qE '\[(14|30|16|hosting provider[^]]*|email provider[^]]*|Operator[^]]*)\]' && warn "the Privacy page still contains [bracketed] placeholders to complete"

  # Internal services must not be reachable from outside
  for p in 3306 3000 8080; do
    if timeout 4 bash -c ">/dev/tcp/$host/$p" 2>/dev/null; then fail "port $p is open on $host (the database/app/Adminer must not be exposed)"; else pass "port $p is closed from here"; fi
  done
  echo "  (the closed-port checks only mean something when this script runs from outside the server)"
}

# Arguments after the mode, in any order: an https:// URL, a path to the env file, and/or --insecure.
URL=""; ENVF=""; INSECURE=""
for arg in "$@"; do
  case "$arg" in
    --insecure) INSECURE="--insecure" ;;
    http://*|https://*) URL="$arg" ;;
    *) ENVF="$arg" ;;
  esac
done

case "$MODE" in
  config) check_config "$ENVF" ;;
  remote) [ -n "$URL" ] || { echo "give the site URL, e.g. https://noagenda.example.com" >&2; exit 2; }; check_remote "$URL" "$INSECURE" ;;
  all)    [ -n "$URL" ] || { echo "give the site URL, e.g. https://noagenda.example.com" >&2; exit 2; }; check_config "$ENVF"; check_remote "$URL" "$INSECURE" ;;
  *) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac

printf '\n%s failure(s), %s warning(s)\n' "$fails" "$warns"
[ "$fails" -eq 0 ]
