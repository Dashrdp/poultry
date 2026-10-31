import os
import time
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://poultry:poultry-dev@localhost:5432/poultry",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_INIT_DB_ATTEMPTS = 40
_INIT_DB_DELAY_SEC = 1.5


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from models import (  # noqa: F401
        BirdAdjustment,
        Breed,
        BreedStandard,
        Customer,
        DailyShedLog,
        Farm,
        FarmRates,
        FeedMovement,
        Flock,
        ManagerFarmAssignment,
        Shed,
        User,
    )

    # Docker DNS / Postgres first-boot can lag behind depends_on healthy.
    last_exc: BaseException | None = None
    for attempt in range(1, _INIT_DB_ATTEMPTS + 1):
        try:
            Base.metadata.create_all(bind=engine)
            return
        except OperationalError as exc:
            last_exc = exc
            if attempt == _INIT_DB_ATTEMPTS:
                break
            time.sleep(_INIT_DB_DELAY_SEC)
    assert last_exc is not None
    raise last_exc
