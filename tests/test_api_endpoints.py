import pytest
import base64
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Asserts that health check operates correctly."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "active"
    assert "version" in response.json()


@pytest.mark.asyncio
async def test_detect_invalid_mime():
    """Asserts that non-image file uploads are blocked with HTTP 415."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"image": ("test.txt", b"plain text content", "text/plain")}
        response = await ac.post("/api/detect", files=files)
    assert response.status_code == 415
    assert "Unsupported payload format" in response.json()["detail"]


@pytest.mark.asyncio
@patch("app.api.endpoints.core.run_aegis_screening")
async def test_detect_success_synchronous(mock_run_screening):
    """Asserts that a successful screening executes synchronously returning HTTP 200."""
    mock_run_screening.return_value = {
        "status": "success",
        "verdict": {
            "overall_verdict": "SCREENING COMPLETE - NO CRITICAL ANOMALIES DETECTED",
            "reason": "Clear eyes",
            "risk_score": 0.08,
            "confidence_level": 0.94
        },
        "metrics": {
            "infection": {"left_redness": 0.02, "right_redness": 0.03, "asymmetry_index": 0.01, "exudate_detected": False, "exudate_ratio": 0.0, "infection_probability": 0.05},
            "drug": {"left_pir": 0.32, "right_pir": 0.33, "avg_pir": 0.325, "gaze_drift": 0.02, "detected_category": "None", "impairment_score": 0.10},
            "trauma": {"left_ptosis_ratio": 0.37, "right_ptosis_ratio": 0.38, "avg_ptosis_ratio": 0.375, "fatigue_flag": False, "anisocoria_flag": False, "delta_pupil_mm": 0.1, "trauma_score": 0.03}
        },
        "processed_image": "dummy_full_b64",
        "processed_images": {
            "left_eye": "data:image/png;base64,dummyleft",
            "right_eye": "data:image/png;base64,dummyright"
        }
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"image": ("test.png", b"dummy png content", "image/png")}
        data = {
            "operator_id": "OP-9900",
            "case_id": "CASE-1122",
            "lighting_profile": "artificial"
        }
        response = await ac.post("/api/detect", files=files, data=data)
        
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["verdict"]["overall_verdict"] == "SCREENING COMPLETE - NO CRITICAL ANOMALIES DETECTED"
    assert res_data["operator_id"] == "OP-9900"


@pytest.mark.asyncio
@patch("app.api.endpoints.core.run_aegis_screening")
async def test_detect_calibration_profile_parameter(mock_run_screening):
    """Asserts that calibration_profile form data parameter is accepted and forwarded."""
    mock_run_screening.return_value = {
        "status": "success",
        "calibration_profile": "low_light",
        "verdict": {"overall_verdict": "SCREENING COMPLETE", "reason": "Clear eyes", "risk_score": 0.05, "confidence_level": 0.95},
        "metrics": {
            "infection": {"left_redness": 0.02, "right_redness": 0.03, "asymmetry_index": 0.01, "exudate_detected": False, "exudate_ratio": 0.0, "infection_probability": 0.05},
            "drug": {"left_pir": 0.32, "right_pir": 0.33, "avg_pir": 0.325, "gaze_drift": 0.02, "detected_category": "None", "impairment_score": 0.10},
            "trauma": {"left_ptosis_ratio": 0.37, "right_ptosis_ratio": 0.38, "avg_ptosis_ratio": 0.375, "fatigue_flag": False, "anisocoria_flag": False, "delta_pupil_mm": 0.1, "trauma_score": 0.03}
        },
        "processed_image": "dummy_b64"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"image": ("test.png", b"dummy png content", "image/png")}
        data = {
            "operator_id": "OP-7392",
            "case_id": "CASE-8821",
            "calibration_profile": "low_light"
        }
        response = await ac.post("/api/detect", files=files, data=data)

    assert response.status_code == 200
    mock_run_screening.assert_called_once()
    _, kwargs = mock_run_screening.call_args
    assert kwargs.get("lighting_profile") == "low_light"



@pytest.mark.asyncio
async def test_task_status_endpoint():
    """Asserts that status polling returns synchronous compatibility payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/status/mock-task-id-123")
        
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_trends_endpoint_auth_failure():
    """Asserts that accessing trends logs without valid supervisor credentials triggers HTTP 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/trends")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_trends_endpoint_auth_success():
    """Asserts that supervisor verification opens the archives dashboard payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": "Basic " + base64.b64encode(b"admin:password123").decode()}
        response = await ac.get("/api/trends", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["fleet"]) >= 10
    assert "overall_verdict" in data["fleet"][0]


@pytest.mark.asyncio
async def test_delete_log_unauthorized():
    """Asserts that deleting a log entry without valid supervisor credentials triggers HTTP 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/admin/logs/1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_log_not_found():
    """Asserts that deleting a non-existent log entry triggers HTTP 404."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": "Basic " + base64.b64encode(b"admin:password123").decode()}
        response = await ac.delete("/api/admin/logs/999999", headers=headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_log_success():
    """Asserts that an existing audit log record can be deleted successfully with supervisor auth."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": "Basic " + base64.b64encode(b"admin:password123").decode()}
        
        # 1. Fetch current logs to grab a valid ID
        trends_resp = await ac.get("/api/trends", headers=headers)
        assert trends_resp.status_code == 200
        fleet = trends_resp.json()["fleet"]
        assert len(fleet) > 0
        target_log_id = fleet[0]["id"]
        
        # 2. Delete target log entry
        del_resp = await ac.delete(f"/api/admin/logs/{target_log_id}", headers=headers)
        assert del_resp.status_code == 200
        del_data = del_resp.json()
        assert del_data["status"] == "success"
        assert del_data["deleted_id"] == target_log_id
        
        # 3. Verify deletion
        trends_resp_after = await ac.get("/api/trends", headers=headers)
        fleet_after = trends_resp_after.json()["fleet"]
        remaining_ids = [l["id"] for l in fleet_after]
        assert target_log_id not in remaining_ids


@pytest.mark.asyncio
async def test_purge_all_unauthorized():
    """Asserts that bulk purge without supervisor credentials triggers HTTP 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.delete("/api/logs/purge-all")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_purge_all_logs_success():
    """Asserts that bulk purge clears all telemetry records from database."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = {"Authorization": "Basic " + base64.b64encode(b"admin:password123").decode()}
        
        # 1. Trigger bulk purge
        purge_resp = await ac.delete("/api/logs/purge-all", headers=headers)
        assert purge_resp.status_code == 200
        purge_data = purge_resp.json()
        assert purge_data["status"] == "success"
        assert "permanently purged" in purge_data["message"]
        
        # 2. Verify all records are gone
        trends_resp = await ac.get("/api/trends", headers=headers)
        assert trends_resp.status_code == 200
        fleet = trends_resp.json()["fleet"]
        assert len(fleet) == 0


