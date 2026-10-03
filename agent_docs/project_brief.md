# Project brief

## Vision

Help poultry farm **owners** monitor multi-farm operations and **farm managers** log daily production and feed with minimal friction.

## Domain terms

| Term | Meaning |
|------|---------|
| **Customer** | Tenant account; owns users and farms |
| **Farm** | Physical farm site under a customer |
| **Shed** | Housing unit under a farm; has birds and daily egg logs |
| **Godown** | Farm-level store for feed stock |
| **Owner** | Role: monitor + analytics |
| **Farm Manager** | Role: daily data entry (birds, eggs, feed) |
| **DailyShedLog** | One record per shed per date: bird count, eggs |

## Principles

1. Tenant isolation first.
2. Managers enter data fast; owners trust the numbers.
3. Build to the PRD; defer out-of-scope items.
4. Prefer clear domain modules over clever abstractions.

Canonical product doc: [../docs/PRD-poultry-farm-MVP.md](../docs/PRD-poultry-farm-MVP.md).
