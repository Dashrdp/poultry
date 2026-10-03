from pydantic import BaseModel, Field


class DailyLogWrite(BaseModel):
    eggs_collected: int = Field(ge=0)
    deaths: int = Field(ge=0)
    notes: str | None = Field(default=None, max_length=500)


class DailyLogOut(BaseModel):
    shed_id: str
    date: str
    eggs_collected: int
    deaths: int
    notes: str | None
    live_bird_count: int


class LiveCountWrite(BaseModel):
    live_bird_count: int = Field(ge=0)
    reason: str | None = Field(default=None, max_length=200)


class LiveCountOut(BaseModel):
    shed_id: str
    live_bird_count: int
