#!/usr/bin/env bash
# Creates the blog database and loads its tables.
#
# Run this on your own computer, signed in to Cloudflare:
#     npx wrangler login
#     bash scripts/setup-blog-db.sh
#
# It is safe to run more than once.

set -euo pipefail

DB_NAME="${DB_NAME:-falkner-blog}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

command -v npx >/dev/null || { echo "Node.js is needed. Install it from https://nodejs.org and try again."; exit 1; }

say "1. Looking for a database called '$DB_NAME'..."
if npx --yes wrangler d1 list --json 2>/dev/null | grep -q "\"name\": *\"$DB_NAME\""; then
  echo "   Already exists. Leaving it alone."
else
  echo "   Not there yet. Creating it."
  npx --yes wrangler d1 create "$DB_NAME"
fi

say "2. Creating the tables (posts, images, users)..."
npx --yes wrangler d1 execute "$DB_NAME" --remote --file="$HERE/schema.sql" --yes

say "3. The value you need for the Pages binding:"
DB_ID="$(npx --yes wrangler d1 list --json 2>/dev/null \
  | tr -d ' \n' \
  | grep -o "\"uuid\":\"[^\"]*\",\"name\":\"$DB_NAME\"" \
  | head -1 | cut -d'"' -f4 || true)"

if [ -n "$DB_ID" ]; then
  echo "   Database name : $DB_NAME"
  echo "   Database ID   : $DB_ID"
else
  echo "   Run 'npx wrangler d1 list' to see the ID."
fi

cat <<'NEXT'

Next, in the Cloudflare dashboard:

  Workers & Pages  ->  your Pages project  ->  Settings  ->  Bindings
    Add binding  ->  D1 database
      Variable name : DB
      D1 database   : falkner-blog
    Save, for BOTH Production and Preview.

Then finish with scripts/setup-access.sh to turn on email sign-in.
NEXT
