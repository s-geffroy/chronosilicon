#!/bin/sh
# Runs the blocking checks of a gate and keeps the full logs as evidence
# (CS-11: commands, outputs, environment). Usage: sh scripts/run-gate.sh G0|G1
# Meant to run inside the 'node' tool container:
#   sudo appctl run node sh scripts/run-gate.sh G1
set -u
export NO_COLOR=1
unset FORCE_COLOR
GATE="${1:?gate name}"
DIR="docs/reports/logs/${GATE}"
mkdir -p "$DIR"
SUMMARY="$DIR/summary.txt"
{
  echo "gate=$GATE"
  echo "date_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "dirty=$(git status --porcelain 2>/dev/null | grep -v '^?? docs/reports/' | wc -l)"
  echo "node=$(node --version) npm=$(npm --version)"
  echo "image=mcr.microsoft.com/playwright:v1.65.0-noble"
  echo "uname=$(uname -srm)"
} > "$SUMMARY"
STEPS="ci lint typecheck validate:data test build"
[ "$GATE" != "G0" ] && STEPS="$STEPS test:e2e"
FAIL=0
for s in $STEPS; do
  LOG="$DIR/$(echo "$s" | tr ':' '_').log"
  if [ "$s" = "ci" ]; then CMD="npm ci"; else CMD="npm run $s"; fi
  echo "\$ $CMD" > "$LOG"
  if sh -c "$CMD" >> "$LOG" 2>&1; then R=PASS; else R=FAIL; FAIL=1; fi
  echo "$s=$R" | tee -a "$SUMMARY"
done
echo "overall=$([ $FAIL = 0 ] && echo PASS || echo FAIL)" | tee -a "$SUMMARY"
exit $FAIL
