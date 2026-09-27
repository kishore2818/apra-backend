# APRA Backend API Server & Data Services

Backend service for **APRA** (*Association for Ponnappa Nadar Nagar Residents Amenity* / பொன்னப்ப நாடார் நகர் குடியிருப்பு வசதி மேம்பாட்டு சங்கம்), Nagercoil - 629 004 (Regd. No. 25/2023).

---

## 📁 Architecture Overview

- **Node.js Express API** (`src/server.js`): RESTful endpoints for membership registration, admin review, and office bearers directory on port 5001.
- **Google Sheets Webhook** (`google-sheets/Code.gs`): Google Apps Script synchronization for direct cloud sheet logging.
- **PostgreSQL Database** (`config/schema.sql`): Relational schema for enterprise storage of members, families, and receipts.
- **Python Analytics** (`analytics/member_analytics.py`): Pandas demographic analyzer & report generator.

---

## 🚀 Quick Start (Development & Deployment)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Fill in your `PORT`, `CORS_ORIGIN`, and optional `DATABASE_URL` / `GOOGLE_SHEET_WEBHOOK_URL`.

### 3. Run Server
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

---

## 📡 API Endpoints

- `GET  /api/health` — Service health check
- `GET  /api/heads` — Fetch committee members directory
- `POST /api/heads` — Add or reset office bearers
- `POST /api/membership` — Submit Document 2 membership application
- `GET  /api/admin/members` — Fetch registered members (Admin)
- `PATCH /api/admin/status` — Update membership verification status (`Approved` / `Rejected`)

---

## 🛡️ License & Registration
Registered under the Tamil Nadu Societies Registration Act (Regd. No. 25/2023).
Association for Ponnappa Nadar Nagar Residents Amenity (APRA), Nagercoil - 629 004.
