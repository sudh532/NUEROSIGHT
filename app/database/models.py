import random
from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, Boolean
from sqlalchemy.orm import Session
from app.database.connection import Base, engine, SessionLocal
from app.database.crypto_types import EncryptedStringField

class FieldLog(Base):
    __tablename__ = "field_logs"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat() + "Z")
    operator_id = Column(EncryptedStringField, index=True, nullable=True)
    case_id = Column(EncryptedStringField, index=True, nullable=True)
    overall_verdict = Column(EncryptedStringField, nullable=False)
    redness_score = Column(Float, default=0.0)
    dilation_score = Column(Float, default=0.0)
    ptosis_score = Column(Float, default=0.0)
    anisocoria_flag = Column(Boolean, default=False)
    image_hash = Column(String, nullable=False)

    # Forensic audit requirements columns
    operator_badge_id = Column(EncryptedStringField, index=True, nullable=True)
    case_incident_hash = Column(EncryptedStringField, index=True, nullable=True)
    verdict_category = Column(EncryptedStringField, nullable=True)
    is_impaired = Column(Boolean, default=False)
    left_redness = Column(Float, default=0.0)
    right_redness = Column(Float, default=0.0)
    left_pir = Column(Float, default=0.0)
    right_pir = Column(Float, default=0.0)


def seed_database(db: Session):
    """Pre-populates the database with 10 mock field logs representing scans in the last 24 hours."""
    # List of tuples: (operator_id, case_id, verdict, redness, dilation, ptosis, anisocoria)
    mock_data = [
        ("OP-7392", "CASE-9021", "SCREENING COMPLETE - NO CRITICAL ANOMALIES DETECTED", 0.04, 0.32, 0.38, False),
        ("OP-1042", "CASE-1082", "IMPAIRMENT INDICATORS DETECTED - CATEGORY: CNS STIMULANT", 0.08, 0.52, 0.36, False),
        ("OP-8821", "CASE-4721", "PATHOLOGICAL EXUDATE DETECTED - POTENTIAL INFECTIOUS CONDITION", 0.22, 0.31, 0.35, False),
        ("OP-9021", "CASE-3312", "CRITICAL ALERT - POSSIBLE HEAD TRAUMA / CONCUSSION DETECTED", 0.05, 0.33, 0.39, True),
        ("OP-4211", "CASE-6612", "SCREENING COMPLETE - NO CRITICAL ANOMALIES DETECTED", 0.02, 0.28, 0.41, False),
        ("OP-5012", "CASE-9921", "IMPAIRMENT INDICATORS DETECTED - CATEGORY: CNS DEPRESSANT", 0.03, 0.16, 0.34, False),
        ("OP-7392", "CASE-5021", "IMPAIRMENT INDICATORS DETECTED - CATEGORY: CANNABIS/ALCOHOL", 0.24, 0.35, 0.33, False),
        ("OP-3829", "CASE-1049", "SCREENING COMPLETE - NO CRITICAL ANOMALIES DETECTED", 0.06, 0.34, 0.37, False),
        ("OP-9021", "CASE-8841", "CRITICAL ALERT - POSSIBLE HEAD TRAUMA / CONCUSSION DETECTED", 0.04, 0.30, 0.32, True),
        ("OP-8821", "CASE-1129", "PATHOLOGICAL EXUDATE DETECTED - POTENTIAL INFECTIOUS CONDITION", 0.19, 0.29, 0.31, False)
    ]
    
    now = datetime.utcnow()
    
    for i, item in enumerate(mock_data):
        op_id, cs_id, verdict, redness, dilation, ptosis, anisocoria = item
        # Spread timestamps over the last 24 hours
        time_offset = timedelta(hours=i * 2, minutes=random.randint(1, 45))
        timestamp = (now - time_offset).isoformat() + "Z"
        image_hash = f"aegishash{i}1234567890abcdef"
        
        log = FieldLog(
            timestamp=timestamp,
            operator_id=op_id,
            case_id=cs_id,
            overall_verdict=verdict,
            redness_score=redness,
            dilation_score=dilation,
            ptosis_score=ptosis,
            anisocoria_flag=anisocoria,
            image_hash=image_hash,
            operator_badge_id=op_id,
            case_incident_hash=cs_id,
            verdict_category=verdict,
            left_redness=redness,
            right_redness=redness,
            left_pir=dilation,
            right_pir=dilation
        )
        db.add(log)
        
    db.commit()


from sqlalchemy.exc import OperationalError

def init_tables():
    """Initializes tables and seeds mock logs if empty, handling schema mismatches automatically."""
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        count = db.query(FieldLog).count()
        if count < 10:
            seed_database(db)
    except OperationalError as e:
        print("[DB RESTORATION] DB Schema mismatch detected (OperationalError). Rebuilding tables...", e)
        db.rollback()
        db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        seed_database(db)
    except Exception as ex:
        print("[DB WARNING] Unexpected error initializing tables:", ex)
        db.rollback()
    finally:
        db.close()
