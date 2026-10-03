from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    users: Mapped[list["User"]] = relationship(back_populates="customer")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # owner | farm_manager
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    customer: Mapped["Customer"] = relationship(back_populates="users")


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    sheds: Mapped[list["Shed"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    assignments: Mapped[list["ManagerFarmAssignment"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    feed_movements: Mapped[list["FeedMovement"]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    rates: Mapped["FarmRates | None"] = relationship(
        back_populates="farm", cascade="all, delete-orphan", uselist=False
    )


class Shed(Base):
    __tablename__ = "sheds"
    __table_args__ = (
        UniqueConstraint("farm_id", "number", name="uq_sheds_farm_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    farm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("farms.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    farm: Mapped["Farm"] = relationship(back_populates="sheds")
    logs: Mapped[list["DailyShedLog"]] = relationship(
        back_populates="shed", cascade="all, delete-orphan"
    )
    adjustments: Mapped[list["BirdAdjustment"]] = relationship(
        back_populates="shed", cascade="all, delete-orphan"
    )
    flocks: Mapped[list["Flock"]] = relationship(
        back_populates="shed", cascade="all, delete-orphan"
    )


class Breed(Base):
    __tablename__ = "breeds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # NULL = system breed visible to every customer
    customer_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    standards: Mapped[list["BreedStandard"]] = relationship(
        back_populates="breed",
        cascade="all, delete-orphan",
        order_by="BreedStandard.age_week",
    )


class BreedStandard(Base):
    __tablename__ = "breed_standards"

    breed_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("breeds.id"), primary_key=True
    )
    age_week: Mapped[int] = mapped_column(Integer, primary_key=True)
    hdep_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    hhe_cum: Mapped[float | None] = mapped_column(Float, nullable=True)
    mort_cum_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    feed_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    egg_wt_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    body_wt_g: Mapped[float | None] = mapped_column(Float, nullable=True)

    breed: Mapped["Breed"] = relationship(back_populates="standards")


class Flock(Base):
    __tablename__ = "flocks"
    __table_args__ = (
        Index(
            "uq_flocks_one_active_per_shed",
            "shed_id",
            unique=True,
            postgresql_where=text("depleted_on IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    shed_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sheds.id"), nullable=False, index=True
    )
    breed_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("breeds.id"), nullable=False
    )
    hatch_date: Mapped[date] = mapped_column(Date, nullable=False)
    placed_date: Mapped[date] = mapped_column(Date, nullable=False)
    birds_placed: Mapped[int] = mapped_column(Integer, nullable=False)
    live_birds: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    chick_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    depleted_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    shed: Mapped["Shed"] = relationship(back_populates="flocks")
    breed: Mapped["Breed"] = relationship()


class DailyShedLog(Base):
    __tablename__ = "daily_shed_logs"
    __table_args__ = (
        UniqueConstraint("shed_id", "date", name="uq_daily_shed_log_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    shed_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sheds.id"), nullable=False, index=True
    )
    flock_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("flocks.id"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    eggs_collected: Mapped[int] = mapped_column(Integer, nullable=False)
    deaths: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    shed: Mapped["Shed"] = relationship(back_populates="logs")
    flock: Mapped["Flock"] = relationship()


class BirdAdjustment(Base):
    __tablename__ = "bird_adjustments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    shed_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sheds.id"), nullable=False, index=True
    )
    flock_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("flocks.id"), nullable=False, index=True
    )
    at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    previous_count: Mapped[int] = mapped_column(Integer, nullable=False)
    live_bird_count: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    shed: Mapped["Shed"] = relationship(back_populates="adjustments")
    flock: Mapped["Flock"] = relationship()


class FeedMovement(Base):
    __tablename__ = "feed_movements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    farm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("farms.id"), nullable=False, index=True
    )
    direction: Mapped[str] = mapped_column(String(8), nullable=False)  # in | out
    qty_kg: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    farm: Mapped["Farm"] = relationship(back_populates="feed_movements")


class FarmRates(Base):
    __tablename__ = "farm_rates"

    farm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("farms.id"), primary_key=True
    )
    egg_price: Mapped[float] = mapped_column(Float, nullable=False)
    feed_cost_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    farm: Mapped["Farm"] = relationship(back_populates="rates")


class ManagerFarmAssignment(Base):
    __tablename__ = "manager_farm_assignments"
    __table_args__ = (
        UniqueConstraint("user_id", "farm_id", name="uq_manager_farm"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), primary_key=True
    )
    farm_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("farms.id"), primary_key=True
    )

    farm: Mapped["Farm"] = relationship(back_populates="assignments")
