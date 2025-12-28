# Wired Log Analyzer Tool

This tool helps support engineers upload and analyze Alcatel-Lucent tech_support bundles, extract smart insights, and generate structured reports.

## Structure
- `backend/`: Parsing logic, insights, backend APIs
- `frontend/`: HTML/JS interface (React optional)
- `reports/`: Report generation using HTML-to-PDF
- `uploaded/`: Uploaded .tar bundles for analysis

Run backend:
```bash
uvicorn main:app --reload
```

Frontend can be served via any static host or React dev server.
