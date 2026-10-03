import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://poultry:poultry-dev@localhost:5432/poultry",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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

    Base.metadata.create_all(bind=engine)
