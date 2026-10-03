from pydantic import BaseModel


class ManagerCreate(BaseModel):
    email: str
    password: str
    farm_ids: list[str]


class ManagerUpdate(BaseModel):
    password: str | None = None
    farm_ids: list[str] | None = None


class ManagerOut(BaseModel):
    id: str
    email: str
    role: str
    customer_id: str
    farm_ids: list[str]
