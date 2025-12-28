# Wired Log Analyzer Tool

This tool helps support engineers upload and analyze Alcatel-Lucent tech_support bundles, extract smart insights, and generate structured reports.

## Structure
- `backend/`: Parsing logic, insights, backend APIs
- `frontend/`: HTML/JS interface (React optional)
- `reports/`: Report generation using HTML-to-PDF
- `uploaded/`: Uploaded .tar bundles for analysis

<img width="1877" height="968" alt="Screenshot 2025-12-28 215925" src="https://github.com/user-attachments/assets/93fe9b11-3a1e-4641-9a1e-56d867b19e69" />


Run backend:
```bash
uvicorn main:app --reload
```

Frontend can be served via any static host or React dev server.
