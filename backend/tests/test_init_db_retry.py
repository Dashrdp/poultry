from unittest.mock import patch

import pytest
from sqlalchemy.exc import OperationalError


def test_init_db_retries_then_succeeds() -> None:
    import db as db_mod

    calls = {"n": 0}

    def flaky_create_all(*_args, **_kwargs):
        calls["n"] += 1
        if calls["n"] < 3:
            raise OperationalError("failed to resolve host 'db'", None, None)
        return None

    with (
        patch.object(db_mod.Base.metadata, "create_all", side_effect=flaky_create_all),
        patch.object(db_mod, "_INIT_DB_DELAY_SEC", 0),
    ):
        db_mod.init_db()

    assert calls["n"] == 3


def test_init_db_raises_after_exhausted_retries() -> None:
    import db as db_mod

    err = OperationalError("failed to resolve host 'db'", None, None)

    with (
        patch.object(db_mod.Base.metadata, "create_all", side_effect=err),
        patch.object(db_mod, "_INIT_DB_ATTEMPTS", 2),
        patch.object(db_mod, "_INIT_DB_DELAY_SEC", 0),
    ):
        with pytest.raises(OperationalError):
            db_mod.init_db()
