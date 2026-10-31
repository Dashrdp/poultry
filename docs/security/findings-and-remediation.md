# Security findings and remediation

## 2026-10-31 — Deploy surface (Caddy + Docker)

### PF-DEP-001 — Session secret / Secure cookie defaults

- **Severity:** High (if left at defaults in production)
- **Evidence:** `PF_SESSION_SECRET` defaulted to `dev-only-change-me`; `https_only` was hardcoded `False`.
- **High-level reproduction:** Deploy with unset secret; session cookies forgeable / sent over HTTP.
- **Impact:** Session takeover.
- **Fix:** Compose requires `PF_SESSION_SECRET`. `PF_HTTPS_ONLY` defaults to `1` in deploy compose. Operators must use a strong secret and real HTTPS (`SITE_ADDRESS=domain`).

### PF-DEP-002 — Postgres not published on host

- **Severity:** Medium (misconfig risk)
- **Evidence:** Root compose published `5432` for local dev.
- **High-level reproduction:** Expose DB port on a public host.
- **Impact:** Brute-force / data access if weak password.
- **Fix:** `deploy/docker-compose.yml` keeps Postgres on the internal network only. Use a strong `POSTGRES_PASSWORD`.

### PF-DEP-003 — Demo seed credentials

- **Severity:** Medium on internet-facing hosts
- **Evidence:** `seed.py` creates `owner@demo.local` / `owner-pass`.
- **High-level reproduction:** Hit login after seed on a public URL.
- **Impact:** Full Owner access.
- **Fix / checklist:** Change passwords after seed, or skip demo seed and create real users before exposing DNS. Do not leave demo passwords on production.
