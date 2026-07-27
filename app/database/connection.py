from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Configured for high concurrency production connection pooling (OPTIMIZE.MD Phase 2)
is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI database dependency provider."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
