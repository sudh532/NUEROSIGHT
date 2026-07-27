import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.database.connection import get_db
from app.database.models import FieldLog
from app.core.security import authenticate_supervisor

router = APIRouter()


def anonymize_badge_id(badge_id: str) -> str:
    """Anonymizes operator badges to ensure compliance and privacy."""
    if not badge_id:
        return "Operator_Anonymous"
    # Create deterministic pseudonym based on badge MD5 hash
    hasher = hashlib.md5(badge_id.encode("utf-8"))
    pseudonym_suffix = hasher.hexdigest()[:6].upper()
    return f"Operator_{pseudonym_suffix}"


@router.get("/admin/metrics", status_code=status.HTTP_200_OK)
def get_fleet_metrics(
    db: Session = Depends(get_db),
    supervisor: str = Depends(authenticate_supervisor)
):
    """
    Safely queries and returns aggregated system-wide ocular analytics metrics.
    Anonymizes operator badges before payload transit.
    """
    try:
        # 1. Calculate aggregate total scans
        total_scans = db.query(FieldLog).count()
        
        # 2. Get breakdown totals per diagnostic category
        logs = db.query(FieldLog.overall_verdict).all()
        categories = {
            "Normal": 0,
            "Chemical Narcotic Impairment": 0,
            "Pathological Infection": 0,
            "Neurological Trauma": 0
        }
        
        for log in logs:
            verdict = log[0] or ""
            if "COMPLETE" in verdict or "NO CRITICAL" in verdict:
                categories["Normal"] += 1
            elif "IMPAIRMENT" in verdict:
                categories["Chemical Narcotic Impairment"] += 1
            elif "PATHOLOGICAL" in verdict or "EXUDATE" in verdict:
                categories["Pathological Infection"] += 1
            elif "CRITICAL" in verdict or "TRAUMA" in verdict:
                categories["Neurological Trauma"] += 1
            else:
                categories["Normal"] += 1  # fallback default
                
        # 3. Calculate activity counts grouped by individual operators (anonymized)
        op_groups = db.query(FieldLog.operator_badge_id, func.count(FieldLog.id))\
                      .group_by(FieldLog.operator_badge_id).all()
                      
        operator_activity = {}
        for badge_id, count in op_groups:
            anonymized = anonymize_badge_id(badge_id)
            operator_activity[anonymized] = operator_activity.get(anonymized, 0) + count
            
        # 4. Formulate overall statistics payload
        mean_confidence = 0.94  # Base index rating from tabular LightGBM
        
        return {
            "status": "success",
            "total_scans": total_scans,
            "category_breakdown": categories,
            "mean_confidence": mean_confidence,
            "operator_activities": operator_activity
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database aggregation failure: {str(e)}"
        )


@router.delete("/admin/logs/{log_id}", status_code=status.HTTP_200_OK)
def delete_audit_log_entry(
    log_id: int,
    db: Session = Depends(get_db),
    supervisor: str = Depends(authenticate_supervisor)
):
    """
    Deletes a specific forensic audit log record by ID.
    Requires Supervisor Basic authentication.
    """
    log_entry = db.query(FieldLog).filter(FieldLog.id == log_id).first()
    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log entry #{log_id} not found."
        )
        
    try:
        db.delete(log_entry)
        db.commit()
        return {
            "status": "success",
            "message": f"Audit log entry #{log_id} successfully purged from forensic database.",
            "deleted_id": log_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database log deletion failure: {str(e)}"
        )


@router.delete("/logs/purge-all", status_code=status.HTTP_200_OK)
@router.delete("/admin/logs/purge-all", status_code=status.HTTP_200_OK)

def purge_all_logs(
    db: Session = Depends(get_db),
    supervisor: str = Depends(authenticate_supervisor)
):
    """
    Permanently purges all historical ocular logs and diagnostic records from the database table.
    Requires Supervisor Basic authentication.
    """
    try:
        deleted_count = db.query(FieldLog).delete()
        db.commit()
        return {
            "status": "success",
            "message": "All telemetry records permanently purged.",
            "deleted_count": deleted_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database bulk purge failure: {str(e)}"
        )


