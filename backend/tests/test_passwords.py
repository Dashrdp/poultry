from auth_passwords import hash_password, verify_password


def test_hash_and_verify_roundtrip():
    h = hash_password("secret-pass")
    assert h != "secret-pass"
    assert verify_password("secret-pass", h)
    assert not verify_password("wrong", h)
