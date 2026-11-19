#!/usr/bin/env bash
# Builds the app, serves it locally and runs the browser tests against it.
# Needs Playwright (with Chromium) and Python 3; `pip install openpyxl` for the Excel step.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3100}"
OUT="e2e/.out"; rm -rf "$OUT"; mkdir -p "$OUT/data" "$OUT/shots"
python3 e2e/make-testdata.py "$OUT/data"
npm run build
python3 -m http.server "$PORT" --directory out >/dev/null 2>&1 &
SERVER=$!; trap 'kill $SERVER' EXIT; sleep 2
BASE="http://localhost:$PORT"; FAIL=0
run() { echo "== $1"; if ! node "e2e/$1" "${@:2}" | tee "$OUT/$1.log" | grep -E "PAGEERROR|CONSOLE Uncaught|FAILED|OVERFLOW|^done"; then :; fi; grep -qE "PAGEERROR|FAILED|OVERFLOW" "$OUT/$1.log" && FAIL=1; grep -q "^done" "$OUT/$1.log" || FAIL=1; }
run main.js "$BASE" "$OUT/data" "$OUT/shots"
run brochure-products.js "$BASE" "$OUT/data" "$OUT/shots"
run teaching.js "$BASE" "$OUT/data" "$OUT/shots"
run security.js "$BASE" "$OUT/data" "$OUT/shots"
run profile-fields.js "$BASE" "$OUT/data" "$OUT/shots"
run german.js "$BASE" "$OUT/shots" nothing
run daily-use.js "$BASE" "$OUT/data" "$OUT/shots"
[ "$FAIL" = 0 ] && echo "ALL BROWSER TESTS PASSED" || { echo "SOME BROWSER TESTS FAILED, see $OUT"; exit 1; }
