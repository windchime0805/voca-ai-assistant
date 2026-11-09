from sqlalchemy import create_engine
from sqlalchemy import inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models added in the next phase."""


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def initialize_database() -> None:
    from app.models import task  # noqa: F401
    from app.models import notification  # noqa: F401

    Base.metadata.create_all(bind=engine)
    if "tasks" in inspect(engine).get_table_names():
        columns = {column["name"] for column in inspect(engine).get_columns("tasks")}
        if "notification_at" not in columns:
            sql_type = "DATETIME" if engine.dialect.name == "sqlite" else "TIMESTAMP WITH TIME ZONE"
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE tasks ADD COLUMN notification_at {sql_type}"))
