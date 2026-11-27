# Fixtures npm audit (REMEDIATION-02, AUD02-001)

- `real-2026-11-27.{all,prod}.json` : sorties **réelles** de `npm audit --json` (et `--omit=dev`) sur `remediation-02` le 2026-11-27, dans le conteneur outil.
- Les autres fichiers sont **dérivés** de la sortie réelle par une mutation unique, décrite par leur nom. Les avis `GHSA-fixt-ure0-*` et le paquet `fixture-new-tool` sont **fictifs** : ils n'existent que pour éprouver la porte (`tests/audit-gate.test.ts`).
