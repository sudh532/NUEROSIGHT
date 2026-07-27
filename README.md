# Project Aegis-Eye

Enterprise-grade, field-ruggedized, end-to-end Tactical Ocular Diagnostic & Field Screening System designed for law enforcement, first responders, and field screening operators.

## Tech Stack
- **Backend**: FastAPI, MediaPipe Face Landmarker Tasks API, OpenCV, SQLAlchemy, SQLite
- **Frontend**: Custom Tactical HUD (Vanilla HTML5/CSS3/JavaScript), Chart.js
- **Testing**: PyTest, HTTPX AsyncClient

## Setup Instructions
```bash
cd aegis_eye_platform
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
