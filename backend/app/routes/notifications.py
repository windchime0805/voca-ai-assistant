from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.notification import Notification
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[NotificationRead])
def list_notifications(unread_only: bool = True, db: Session = Depends(get_db)):
    query = select(Notification).order_by(Notification.created_at.desc()).limit(50)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    return db.scalars(query).all()


@router.put("/{notification_id}/read", response_model=NotificationRead)
def mark_read(notification_id: str, db: Session = Depends(get_db)):
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notification)
    return notification
