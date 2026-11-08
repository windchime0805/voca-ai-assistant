from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=5000)
    category: str = Field(default="Personal", min_length=1, max_length=80)
    priority: Literal["Low", "Medium", "High", "Urgent"] = "Medium"
    due_date: date | None = None
    due_time: time | None = None
    notification_at: datetime | None = None

    @field_validator("title", "category")
    @classmethod
    def trim_nonempty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=5000)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    priority: Literal["Low", "Medium", "High", "Urgent"] | None = None
    status: Literal["pending", "completed"] | None = None
    due_date: date | None = None
    due_time: time | None = None
    notification_at: datetime | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    category: str
    priority: str
    status: str
    due_date: date | None
    due_time: time | None
    notification_at: datetime | None
    created_at: datetime
    updated_at: datetime
