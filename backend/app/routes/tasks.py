from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.task import Task
from app.models.notification import Notification
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.scheduler_service import cancel_task_notification, schedule_task_notification

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[TaskRead])
def list_tasks(status: str | None = Query(default=None, pattern="^(pending|completed)$"), due_date: date | None = None, db: Session = Depends(get_db)):
    query = select(Task).order_by(Task.due_date.is_(None), Task.due_date, Task.due_time.is_(None), Task.due_time, Task.created_at.desc())
    if status:
        query = query.where(Task.status == status)
    if due_date:
        query = query.where(Task.due_date == due_date)
    return db.scalars(query).all()


@router.post("", response_model=TaskRead, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    schedule_task_notification(task)
    return task


@router.put("/{task_id}", response_model=TaskRead)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "title" or field == "category":
            value = value.strip() if value is not None else value
            if value == "":
                raise HTTPException(status_code=422, detail=f"{field} cannot be blank")
        setattr(task, field, value)
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    schedule_task_notification(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    cancel_task_notification(task_id)
    db.execute(delete(Notification).where(Notification.task_id == task_id))
    db.delete(task)
    db.commit()
    return Response(status_code=204)
