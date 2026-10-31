"""Resolve which reverse-proxy peers may set X-Forwarded-* headers."""

from __future__ import annotations

_LOOPBACK = ["127.0.0.1", "::1"]


def resolve_trusted_proxy_hosts(raw: str | None) -> list[str]:
    """Parse PF_TRUSTED_PROXIES. Reject '*' (would trust every peer)."""
    if raw is None:
        return list(_LOOPBACK)
    hosts = [h.strip() for h in raw.split(",") if h.strip()]
    if not hosts or "*" in hosts:
        return list(_LOOPBACK)
    return hosts
