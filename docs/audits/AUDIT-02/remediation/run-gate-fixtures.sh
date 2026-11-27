#!/bin/sh
# REMEDIATION-02, AUD02-001, preuve « après » : la porte réelle (scripts/audit-gate.ts) rejouée sur chaque fixture.
F=tests/fixtures/npm-audit
P=$F/real-2026-11-27.prod.json
A=$F/real-2026-11-27.all.json
one() { printf '%s: ' "$1"; out=$(npx tsx scripts/audit-gate.ts --all "$2" --prod "$3" --today "$4" 2>&1); rc=$?; echo "rc=$rc $(echo "$out" | tr '\n' ' ' | sed 's/  */ /g')"; }
for f in $F/*.all.json; do n=$(basename "$f" .all.json); one "$n" "$f" "$P" 2026-11-27; done
one production-advisory "$A" $F/production-advisory.prod.json 2026-11-27
one expired-exception "$A" "$P" 2027-02-01
