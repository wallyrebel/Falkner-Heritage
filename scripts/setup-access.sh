#!/usr/bin/env bash
# Turns on email sign-in for /admin using Cloudflare Access, and prints the
# two settings the site needs.
#
#   export CF_API_TOKEN=...        # a token with "Access: Apps and Policies — Edit"
#   export CF_ACCOUNT_ID=...       # Cloudflare dashboard -> Workers & Pages -> Account ID
#   bash scripts/setup-access.sh you@example.com helper@example.com
#
# Everyone listed on the command line may sign in. You can add or remove people
# later in the dashboard, or by running this again.

set -euo pipefail

API="https://api.cloudflare.com/client/v4"
APP_NAME="${APP_NAME:-Falkner Heritage blog editor}"
SITE_HOST="${SITE_HOST:-falknermsheritage.com}"

command -v curl >/dev/null || { echo "curl is required."; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required."; exit 1; }

: "${CF_API_TOKEN:?Set CF_API_TOKEN first}"
: "${CF_ACCOUNT_ID:?Set CF_ACCOUNT_ID first}"

if [ "$#" -eq 0 ]; then
  echo "Give at least one email address, e.g.:"
  echo "  bash scripts/setup-access.sh you@example.com helper@example.com"
  exit 1
fi

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
call() { curl -sS -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" "$@"; }

# Build the include[] rule: one entry per email address.
INCLUDE="$(python3 -c '
import json, sys
print(json.dumps([{"email": {"email": e.strip().lower()}} for e in sys.argv[1:] if e.strip()]))
' "$@")"

say "1. Creating the Access application for ${SITE_HOST}/admin ..."
PAYLOAD="$(python3 -c '
import json, sys
name, host, include = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
print(json.dumps({
    "name": name,
    "type": "self_hosted",
    "domain": host + "/admin",
    "session_duration": "24h",
    "app_launcher_visible": False,
    "policies": [{
        "name": "Blog contributors",
        "decision": "allow",
        "precedence": 1,
        "include": include,
    }],
}))
' "$APP_NAME" "$SITE_HOST" "$INCLUDE")"

RESPONSE="$(call -X POST "$API/accounts/$CF_ACCOUNT_ID/access/apps" -d "$PAYLOAD")"

AUD="$(printf '%s' "$RESPONSE" | python3 -c '
import json, sys
body = json.load(sys.stdin)
if not body.get("success"):
    print("ERROR " + json.dumps(body.get("errors", [])), file=sys.stderr)
    sys.exit(1)
print(body["result"]["aud"])
')"

say "2. Finding your Zero Trust team domain ..."
TEAM="$(call "$API/accounts/$CF_ACCOUNT_ID/access/organizations" | python3 -c '
import json, sys
body = json.load(sys.stdin)
print(body.get("result", {}).get("auth_domain", "")) if body.get("success") else print("")
')"

say "Done. Add these three settings to your Pages project"
cat <<NEXT

  Workers & Pages -> your Pages project -> Settings -> Variables and Secrets
  (add to BOTH Production and Preview)

    ACCESS_TEAM_DOMAIN   ${TEAM:-<your-team>.cloudflareaccess.com}
    ACCESS_AUD           ${AUD}
    SITE_ORIGIN          https://${SITE_HOST}
    OWNER_EMAILS         $(printf '%s' "$1")

Then redeploy the Pages project once so the new settings take effect, and open
https://${SITE_HOST}/admin

NEXT
