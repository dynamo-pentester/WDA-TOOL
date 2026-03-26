# ⚡ Wired Log Analyzer — Intelligent Tech Support Log Analysis Platform

Wired Log Analyzer is a **security-focused log analysis platform** designed to process and extract insights from Alcatel-Lucent Enterprise (ALE) tech_support bundles.

Built to assist support engineers in **real production environments**, the system automates log parsing, correlation, and insight generation across large-scale datasets.

---

## 🚀 Key Highlights

- 📦 Parses complex `.tar` tech_support bundles
- 🔍 Extracts and structures logs into analyzable formats
- ⚡ Handles multi-GB datasets efficiently
- 🧠 Generates intelligent insights from raw logs
- 📊 Interactive visualization for faster debugging
- 📄 Automated report generation (HTML → PDF)

---

## 🧠 Core Idea

Instead of manually digging through thousands of log lines, this tool:

> Transforms raw infrastructure logs into structured, actionable insights.

It bridges the gap between:
- **Raw system logs**
- **SOC / support engineer workflows**

---

## 🔧 Features

### 📂 Log Processing
- Extracts `.tar` bundles
- Parses tech_support logs
- Handles HMON datasets and structured outputs

### 📊 Visualization
- Interactive dashboards for log exploration
- Time-series analysis for system metrics

### 🧠 Insight Generation
- Log correlation and anomaly detection
- Structured summaries for faster triage

### 📄 Reporting
- Generates clean, shareable reports
- HTML → PDF export support

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python)
- **Frontend:** HTML, JavaScript (React optional)
- **Data Processing:** Python, Pandas
- **Visualization:** Plotly
- **Deployment/Env:** Linux, Docker (optional)

---

## ▶️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/wired-log-analyzer.git
cd wired-log-analyzer

```
2. Install dependencies
```bash
pip install -r requirements.txt
```
4. Run backend
```bash
uvicorn main:app --reload
```

6. Run frontend

Serve via:

Static HTML server
OR React dev server

📸 Screenshots: 

<img width="1919" height="969" alt="Screenshot 2025-12-28 215047" src="https://github.com/user-attachments/assets/f491de1e-62c2-4180-a41f-3e641e6f7bcd" />
<img width="1919" height="970" alt="Screenshot 2025-12-28 215352" src="https://github.com/user-attachments/assets/42d34d8d-2f9c-4331-9c6e-535da4942e58" />
<img width="342" height="971" alt="Screenshot 2025-12-28 215400" src="https://github.com/user-attachments/assets/603bd801-9433-42df-ba86-f3729cc4bb9e" /><img width="350" height="842" alt="Screenshot 2025-12-28 215412" src="https://github.com/user-attachments/assets/218d9c6e-5289-4d8d-9f46-b674a87a1789" />
<img width="1919" height="967" alt="Screenshot 2025-12-28 215616" src="https://github.com/user-attachments/assets/d5794eb9-ffd5-4df5-b1c6-ac5089c3d2a2" />


<img width="1919" height="967" alt="Screenshot 2025-12-28 220024" src="https://github.com/user-attachments/assets/56a636ab-6166-4e75-a445-ae9f044ab666" />


<img width="1289" height="948" alt="Screenshot 2025-12-28 215734" src="https://github.com/user-attachments/assets/09051530-b7fc-4af1-9aed-4ab17f99921e" /><img width="1460" height="551" alt="Screenshot 2025-12-28 215821" src="https://github.com/user-attachments/assets/cd0609f6-f384-4334-91de-ee9f9eddcca7" />



<img width="955" height="586" alt="Screenshot 2025-12-28 215940" src="https://github.com/user-attachments/assets/5e2d75e9-471e-4e3a-935c-4302b8a790df" /><img width="803" height="605" alt="Screenshot 2025-12-28 215954" src="https://github.com/user-attachments/assets/c0669be0-2cec-4ad3-b1fe-be55d3faadca" />


<img width="1877" height="968" alt="Screenshot 2025-12-28 215925" src="https://github.com/user-attachments/assets/93fe9b11-3a1e-4641-9a1e-56d867b19e69" />


Run backend:
```bash
uvicorn main:app --reload
```

Frontend can be served via any static host or React dev server.
