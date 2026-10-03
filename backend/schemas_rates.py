from pydantic import BaseModel, Field


class FarmRatesWrite(BaseModel):
    egg_price: float = Field(ge=0)
    feed_cost_per_kg: float = Field(ge=0)


class FarmRatesOut(BaseModel):
    farm_id: str
    egg_price: float
    feed_cost_per_kg: float
