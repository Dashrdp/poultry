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

### PF-DEP-003 — ProxyHeadersMiddleware trusted_hosts="*"

- **Severity:** Medium
- **Evidence:** `main.py` used `ProxyHeadersMiddleware(trusted_hosts="*")`, which sets uvicorn `always_trust` and accepts `X-Forwarded-Proto` / `X-Forwarded-For` from any peer.
- **High-level reproduction:** Any client that can reach the API sends forged `X-Forwarded-Proto: https` (or client IP) and the app treats it as trusted.
- **Impact:** Secure-cookie / scheme confusion; client IP spoofing in logs if relied upon.
- **Fix:** `PF_TRUSTED_PROXIES` defaults to loopback only; `*` is rejected. Deploy pins bridge `10.201.87.0/24` and trusts **only that CIDR** (not all RFC1918). uvicorn trusts peer **IP**, not Docker DNS names. If IPAM overlaps on a host, change subnet + `PF_TRUSTED_PROXIES` together.

### PF-DEP-005 — Temporary RFC1918 trust expansion (reverted)

- **Severity:** Medium
- **Evidence:** Deploy briefly defaulted `PF_TRUSTED_PROXIES` to `10.0.0.0/8,172.16.0.0/12,192.168.0.0/16` to avoid IPAM overlap.
- **Impact:** Any RFC1918 peer that can reach the API can forge `X-Forwarded-*`.
- **Fix:** Reverted to dedicated `10.201.87.0/24` only.

### PF-DEP-004 — Demo seed credentials

- **Severity:** Medium on internet-facing hosts
- **Evidence:** `seed.py` creates `owner@demo.local` / `owner-pass`.
- **High-level reproduction:** Hit login after seed on a public URL.
- **Impact:** Full Owner access.
- **Fix / checklist:** Change passwords after seed, or skip demo seed and create real users before exposing DNS. Do not leave demo passwords on production.
