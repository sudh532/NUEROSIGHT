import hashlib
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session

from app.core.exceptions import OcularTrackingException
from app.core.security import authenticate_supervisor
from app.database.connection import get_db
from app.database.models import FieldLog
from app.services.orchestrator import run_aegis_screening

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Returns tactical system health coordinates."""
    return {
        "status": "active",
        "system": "Aegis-Eye Tactical Diagnostic Core",
        "version": "2.0.0"
    }


@router.post("/detect", status_code=status.HTTP_200_OK)
async def detect_ocular_threats(
    request: Request,
    image: UploadFile = File(...),
    operator_id: Optional[str] = Form(None),
    case_id: Optional[str] = Form(None),
    case_hash: Optional[str] = Form(None),
    operator_badge_id: Optional[str] = Form(None),
    case_incident_hash: Optional[str] = Form(None),
    lighting_profile: str = Form("artificial"),
    calibration_profile: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Synchronous Ocular Ingress Handler:
    Ingests ocular/face image files, executes the computer vision & ML pipelines synchronously,
    persists forensic logs directly to SQLite, and returns immediate biometric analysis results.
    """
    print(f"[Aegis Core] Incoming payload. Content-Type: {request.headers.get('content-type')}")
    
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported payload format. Aegis ingress accepts only JPEG and PNG image frames."
        )
        
    try:
        content = await image.read()
        img_hash = hashlib.md5(content).hexdigest()
        
        effective_profile = calibration_profile or lighting_profile or "artificial"
        
        # Execute synchronous computer vision & ML screening pipeline
        result = run_aegis_screening(
            image_bytes=content,
            lighting_profile=effective_profile,
            session_profile=None
        )
        
        metrics = result["metrics"]
        verdict_data = result["verdict"]
        
        # Check strict impairment status matching Section 02 logic
        predicted_category = str(verdict_data.get("category", "NONE")).upper()
        risk_score = float(result.get("risk_score", verdict_data.get("risk_score", 0.0)))
        risk_threshold = float(result.get("risk_threshold", 0.70))
        
        is_impaired = bool(
            (predicted_category not in ["NONE", "CLEARED", "SAFE"] and predicted_category != "") or 
            (risk_score >= risk_threshold) or 
            (verdict_data.get("is_impaired") is True)
        )
        verdict_str = "IMPAIRMENT" if is_impaired else "CLEARED"
        
        # Extract explicit operator ID and case hash from form metadata
        op_val = operator_id or operator_badge_id
        cs_val = case_id or case_hash or case_incident_hash
        
        final_op_id = op_val if op_val and op_val != "Anonymous" else "OP-7392"
        final_case_id = cs_val if cs_val and cs_val != "Anonymous" else f"CASE-{hashlib.md5(content[:100]).hexdigest()[:4].upper()}"

        # Persist audit log record synchronously
        try:
            log_entry = FieldLog(
                operator_id=final_op_id,
                case_id=final_case_id,
                overall_verdict=verdict_str,
                redness_score=float((metrics["infection"]["left_redness"] + metrics["infection"]["right_redness"]) / 2.0),
                dilation_score=float(metrics["drug"]["avg_pir"]),
                ptosis_score=float(metrics["trauma"]["avg_ptosis_ratio"]),
                anisocoria_flag=bool(metrics["trauma"]["anisocoria_flag"]),
                image_hash=img_hash,
                operator_badge_id=final_op_id,
                case_incident_hash=final_case_id,
                verdict_category=verdict_str,
                is_impaired=is_impaired,
                left_redness=float(metrics["infection"]["left_redness"]),
                right_redness=float(metrics["infection"]["right_redness"]),
                left_pir=float(metrics["drug"]["left_pir"]),
                right_pir=float(metrics["drug"]["right_pir"])
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            
            result["log_id"] = log_entry.id
            result["operator_id"] = log_entry.operator_id
            result["case_id"] = log_entry.case_id
            result["verdict_str"] = verdict_str
            result["is_impaired"] = is_impaired
        except Exception as db_err:
            db.rollback()
            print(f"[Aegis Core] Failed to persist synchronous audit log: {db_err}")
            
        cat_final = predicted_category if is_impaired else "NONE"
        result["category"] = cat_final
        result["is_impaired"] = is_impaired
        result["risk"] = risk_score
        result["risk_score"] = risk_score
        result["verdict_text"] = "NO SUBSTANCE IMPAIRMENT DETECTED" if not is_impaired else f"{cat_final} IMPAIRMENT DETECTED"
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tactical synchronous processing ingress failure: {str(e)}"
        )


@router.get("/status/{task_id}", status_code=status.HTTP_200_OK)
def get_task_status(task_id: str):
    """
    Legacy task status endpoint compatibility shim for native synchronous processing.
    """
    return {
        "task_id": task_id,
        "status": "SUCCESS",
        "progress": "Synchronous processing runtime active."
    }


from sqlalchemy.exc import OperationalError
from app.database.connection import engine
from app.database.models import Base, seed_database

@router.get("/trends", status_code=status.HTTP_200_OK)
def get_historical_trends(
    db: Session = Depends(get_db),
    supervisor: str = Depends(authenticate_supervisor)
):
    """Retrieves workforce forensic telemetry audit logs. Supervisor Basic authentication required."""
    try:
        logs = db.query(FieldLog).order_by(FieldLog.timestamp.desc()).all()
    except OperationalError as e:
        print("[DB RESTORATION] Schema mismatch detected in /trends route. Rebuilding tables...", e)
        db.rollback()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        seed_database(db)
        logs = db.query(FieldLog).order_by(FieldLog.timestamp.desc()).all()
    
    fleet = []
    for l in logs:
        fleet.append({
            "id": l.id,
            "timestamp": l.timestamp,
            "operator_id": l.operator_id,
            "case_id": l.case_id,
            "overall_verdict": l.overall_verdict,
            "verdict_category": getattr(l, 'verdict_category', l.overall_verdict),
            "is_impaired": getattr(l, 'is_impaired', False),
            "redness_score": round(l.redness_score, 2),
            "dilation_score": round(l.dilation_score, 2),
            "ptosis_score": round(l.ptosis_score, 2),
            "anisocoria_flag": l.anisocoria_flag,
            "image_hash": l.image_hash
        })
    return {"status": "success", "fleet": fleet}


@router.get("/endpoints/trends", status_code=status.HTTP_200_OK)
def get_historical_trends_fallback(
    db: Session = Depends(get_db),
    supervisor: str = Depends(authenticate_supervisor)
):
    """Retrieves workforce forensic telemetry audit logs. Supervisor Basic authentication required."""
    return get_historical_trends(db, supervisor)


@router.delete("/endpoints/admin/logs/{log_id}", status_code=status.HTTP_200_OK)
def delete_audit_log_fallback(
    log_id: int,
    db: Session = Depends(get_db),
    supervisor: str = Depends(authenticate_supervisor)
):
    """Fallback route for deleting audit log entries."""
    from app.api.endpoints.administration import delete_audit_log_entry
    return delete_audit_log_entry(log_id, db, supervisor)


@router.delete("/endpoints/logs/purge-all", status_code=status.HTTP_200_OK)
def purge_all_logs_fallback(
    db: Session = Depends(get_db),
    supervisor: str = Depends(authenticate_supervisor)
):
    """Fallback route for purging all audit log entries."""
    from app.api.endpoints.administration import purge_all_logs
    return purge_all_logs(db, supervisor)


