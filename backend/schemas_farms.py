from pydantic import BaseModel

from schemas_flocks import FlockOut


class FarmCreate(BaseModel):
    name: str
    location: str | None = None


class FarmUpdate(BaseModel):
    name: str | None = None
    location: str | None = None


class FarmOut(BaseModel):
    id: str
    name: str
    location: str


class ShedCreate(BaseModel):
    name: str
    number: int | None = None
    capacity: int | None = None


class ShedUpdate(BaseModel):
    name: str | None = None
    number: int | None = None
    capacity: int | None = None


class ShedOut(BaseModel):
    id: str
    farm_id: str
    name: str
    number: int
    live_bird_count: int
    capacity: int | None
    flock: FlockOut | None
