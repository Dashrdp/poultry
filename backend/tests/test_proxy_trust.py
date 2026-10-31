from proxy_trust import resolve_trusted_proxy_hosts


def test_default_is_loopback_only() -> None:
    assert resolve_trusted_proxy_hosts(None) == ["127.0.0.1", "::1"]
    assert resolve_trusted_proxy_hosts("") == ["127.0.0.1", "::1"]


def test_star_is_rejected() -> None:
    assert resolve_trusted_proxy_hosts("*") == ["127.0.0.1", "::1"]
    assert resolve_trusted_proxy_hosts("*,172.28.10.0/24") == ["127.0.0.1", "::1"]


def test_cidr_and_hosts_pass_through() -> None:
    assert resolve_trusted_proxy_hosts("172.28.10.0/24") == ["172.28.10.0/24"]
    assert resolve_trusted_proxy_hosts("127.0.0.1, 172.28.10.0/24") == [
        "127.0.0.1",
        "172.28.10.0/24",
    ]
