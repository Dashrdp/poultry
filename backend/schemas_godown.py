from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class FeedMovementWrite(BaseModel):
    direction: Literal["in", "out"]
    qty_quintal: float = Field(gt=0)
    date: date
    note: str | None = Field(default=None, max_length=500)


class FeedMovementOut(BaseModel):
    id: str
    farm_id: str
    direction: Literal["in", "out"]
    qty_kg: float
    qty_quintal: float
    date: str
    note: str | None


class GodownOut(BaseModel):
    farm_id: str
    stock_kg: float
    stock_quintal: float
    movements: list[FeedMovementOut]
