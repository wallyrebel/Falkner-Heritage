#!/usr/bin/env bash
# Runs every check. Needs Node 18 or newer and nothing else.
#     bash tests/run.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

fail=0
for t in markdown render api; do
  printf '\n\033[1m=== %s ===\033[0m\n' "$t"
  node "$t.test.mjs" || fail=1
done

printf '\n'
if [ "$fail" -eq 0 ]; then echo "All checks passed."; else echo "Some checks FAILED."; fi
exit "$fail"
