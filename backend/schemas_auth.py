from pydantic import BaseModel, Field


class LoginBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    customer_id: str
