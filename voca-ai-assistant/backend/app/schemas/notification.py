from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    title: str
    message: str
    scheduled_for: datetime
    created_at: datetime
    read_at: datetime | None
