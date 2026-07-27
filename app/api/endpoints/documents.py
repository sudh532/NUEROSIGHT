import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import FieldLog
from app.services.report_generator import build_pdf_report

logger = logging.getLogger("aegis_eye.documents")

router = APIRouter()


@router.post("/documents/export-report/{scan_id}", status_code=status.HTTP_200_OK)
def export_scan_pdf_report(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """
    Safely retrieves a historical screening audit record, decrypts columns transparently,
    compiles a legally-defensible ReportLab PDF, and streams it back to the client.
    """
    # 1. Fetch record from db
    record = db.query(FieldLog).filter(FieldLog.id == scan_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forensic record ID {scan_id} not found in localized audit store."
        )
        
    try:
        # 2. Extract values (database strings are transparently decrypted by EncryptedStringField)
        record_dict = {
            "operator_id": record.operator_id,
            "case_id": record.case_id,
            "timestamp": record.timestamp,
            "image_hash": record.image_hash,
            "overall_verdict": record.overall_verdict,
            "redness_score": record.redness_score,
            "dilation_score": record.dilation_score,
            "ptosis_score": record.ptosis_score,
            "anisocoria_flag": record.anisocoria_flag,
            "left_redness": record.left_redness,
            "right_redness": record.right_redness,
            "left_pir": record.left_pir,
            "right_pir": record.right_pir
        }
        
        # 3. Generate ReportLab PDF layout buffer
        pdf_buffer = build_pdf_report(record_dict)
        
        # 4. Return as streaming file attachment
        filename = f"aegis_screening_report_{scan_id}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except Exception as e:
        logger.error(f"Error compiling forensic PDF document for scan ID {scan_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report rendering compilation failure: {str(e)}"
        )
