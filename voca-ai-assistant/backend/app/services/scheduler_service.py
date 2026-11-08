from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.notification import Notification
from app.models.task import Task

scheduler = BackgroundScheduler(timezone=timezone.utc)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _create_task_notification(task_id: str) -> None:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if task is None or task.status != "pending" or task.notification_at is None:
            return
        scheduled_for = _as_utc(task.notification_at).replace(tzinfo=None)
        existing = db.scalar(select(Notification).where(
            Notification.task_id == task.id,
            Notification.scheduled_for == scheduled_for,
        ))
        if existing:
            return
        db.add(Notification(
            task_id=task.id,
            title=task.title,
            message="Your task is due now.",
            scheduled_for=scheduled_for,
        ))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    finally:
        db.close()


def schedule_task_notification(task: Task) -> None:
    job_id = f"task-notification-{task.id}"
    if scheduler.running:
        try:
            scheduler.remove_job(job_id)
        except Exception:
            pass
    if task.status != "pending" or task.notification_at is None:
        return
    run_at = _as_utc(task.notification_at)
    if scheduler.running:
        scheduler.add_job(
            _create_task_notification,
            trigger=DateTrigger(run_date=run_at, timezone=timezone.utc),
            args=[task.id],
            id=job_id,
            replace_existing=True,
            misfire_grace_time=None,
        )


def cancel_task_notification(task_id: str) -> None:
    if scheduler.running:
        try:
            scheduler.remove_job(f"task-notification-{task_id}")
        except Exception:
            pass


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.start()
    db = SessionLocal()
    try:
        for task in db.scalars(select(Task).where(Task.status == "pending", Task.notification_at.is_not(None))).all():
            schedule_task_notification(task)
    finally:
        db.close()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
