from datetime import date

from pydantic import BaseModel, Field

from flocks import Stage


class BreedOut(BaseModel):
    id: str
    name: str
    is_system: bool


class BreedStandardOut(BaseModel):
    age_week: int
    hdep_pct: float | None
    hhe_cum: float | None
    mort_cum_pct: float | None
    feed_g: float | None
    egg_wt_g: float | None
    body_wt_g: float | None


class FlockCreate(BaseModel):
    breed_id: str
    hatch_date: date
    placed_date: date
    birds_placed: int = Field(gt=0)
    source: str | None = Field(default=None, max_length=200)
    chick_cost: float | None = Field(default=None, ge=0)


class FlockOut(BaseModel):
    id: str
    shed_id: str
    breed_id: str
    breed_name: str
    hatch_date: str
    placed_date: str
    birds_placed: int
    live_birds: int
    source: str | None
    chick_cost: float | None
    depleted_on: str | None
    age_week: int
    stage: Stage
