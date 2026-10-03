import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import db
import models  # noqa: F401  registers tables for drop_all

_test_engine = create_engine(
    os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+psycopg://poultry:poultry-dev@localhost:5432/poultry_test",
    ),
    pool_pre_ping=True,
)
db.engine = _test_engine
db.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)
db.Base.metadata.drop_all(bind=_test_engine)
db.init_db()

from seed import seed_demo

with db.SessionLocal() as session:
    # Topology only — full ops year would break empty-state API tests
    seed_demo(session, with_ops=False)


@pytest.fixture
def client() -> TestClient:
    from main import app

    return TestClient(app)
