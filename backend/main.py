import os
import shutil
import json
import re
import logging
from collections import defaultdict
from pathlib import Path
from datetime import datetime
from fastapi import Form
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, Query, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware

from backend.paged_log_parser import extract_and_paginate_logs

# Configuration
UPLOAD_DIR = "uploaded"
MAX_UPLOAD_SIZE_MB = 500
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# App init
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        max_size = MAX_UPLOAD_SIZE_MB * 1024 * 1024
        content_length = int(request.headers.get("content-length", 0))
        if content_length > max_size:
            return JSONResponse(status_code=413, content={"error": f"File too large. Limit is {MAX_UPLOAD_SIZE_MB}MB."})
        return await call_next(request)

app.add_middleware(LimitUploadSizeMiddleware)

templates = Jinja2Templates(directory="frontend")

def get_today():
    return datetime.now().strftime("%Y-%m-%d")

def get_unique_path(base: Path, prefix: str):
    for i in range(100):
        suffix = f"_{i}" if i > 0 else ""
        candidate = base / f"{prefix}{suffix}"
        if not candidate.exists():
            return candidate
    raise RuntimeError("Too many duplicate uploads")

# Routes
@app.get("/analyze_hmon", response_class=HTMLResponse)
async def analyze_hmon(request: Request, employee: str, case_no: str, date: str, folder: str):
    csv_path = Path(UPLOAD_DIR) / employee / case_no / date / "json" / folder / f"{folder}.csv"
    if not csv_path.is_file():
        raise HTTPException(status_code=404, detail="CSV file not found")
    df = pd.read_csv(csv_path, parse_dates=["time_stamp"], usecols=["time_stamp","cpu_usage","memory_usage","temperature","fan1","fan2","fan3","fan4","fan5"])
    df.dropna(subset=["time_stamp"], inplace=True)

    # Generate summary statistics
    summary_stats = generate_summary_stats(df)

    return templates.TemplateResponse("hmon_visualize.html", {
        "request": request, 
        "summary_stats": summary_stats,
        "folder": folder,
        "employee": employee,
        "case_no": case_no,
        "date": date
    })

@app.get("/visualize_hmon", response_class=HTMLResponse)
async def hmon_ui(request: Request):
    return templates.TemplateResponse("visualize_hmon.html", {"request": request})



# Mount frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


# ──────────────────────────────────────────────────────────
# main.py — Unified FastAPI back-end with legacy JSON logic
#               + new dynamic HMON dashboard
# ──────────────────────────────────────────────────────────
import os, re, shutil, json, logging
from collections import defaultdict
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, Query, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware

# Internal helpers
from backend.hmon_dashboard import HMONDashboard                 # ← visual engine
from backend.paged_log_parser import extract_and_paginate_logs   # ← tar handlergacy

# ──────────────────────────────────────────────────────────
# Config & logger
# ──────────────────────────────────────────────────────────
UPLOAD_DIR, MAX_UPLOAD_SIZE_MB = "uploaded", 500
os.makedirs(UPLOAD_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("HMON-APP")

# ──────────────────────────────────────────────────────────
# App & CORS
# ──────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"],  allow_headers=["*"],
)

class LimitUpload(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if int(request.headers.get("content-length", 0)) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            return JSONResponse(413, {"error": f"File exceeds {MAX_UPLOAD_SIZE_MB} MB"})
        return await call_next(request)
app.add_middleware(LimitUpload)

templates = Jinja2Templates(directory="frontend")
dash      = HMONDashboard()

# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
def today(): return datetime.now().strftime("%Y-%m-%d")

def unique_path(base: Path, prefix: str):
    for i in range(100):
        p = base / f"{prefix}{'_'+str(i) if i else ''}"
        if not p.exists(): return p
    raise RuntimeError("too many duplicates")

def safe_read_csv(csv_path: str) -> pd.DataFrame:
    """
    Robust reader that fixes the trailing-comma defect and mixed timestamps
    found in many HMON CSVs.
    """
    try:
        with open(csv_path, encoding="utf-8", errors="ignore") as f:
            lines = [ln.rstrip() for ln in f]
        if len(lines) < 2: raise ValueError("empty file")

        # trailing comma => extra column
        if lines[1].count(',') > lines[0].count(','):
            lines = [ln.rstrip(',') for ln in lines]

        tmp = Path(csv_path).with_suffix(".fixed.csv")
        tmp.write_text("\n".join(lines), encoding="utf-8")
        df  = pd.read_csv(tmp)
        tmp.unlink(missing_ok=True)

        if 'time_stamp' in df.columns:
            try:
                df['time_stamp'] = pd.to_datetime(df['time_stamp'],
                                                  format='%d %b %Y %H:%M:%S')
            except Exception:
                df['time_stamp'] = pd.to_datetime(df['time_stamp'], errors='coerce')
            df.dropna(subset=['time_stamp'], inplace=True)
        return df
    except Exception as e:
        log.exception("CSV parse failure")
        raise HTTPException(500, f"CSV parse failed: {e}")

def summary_stats(df):
    stats, cols = {}, {
        "CPU Usage (%)"   : "cpu_usage",
        "Memory Usage (MB)": "memory_usage",
        "Temperature (°C)": "temperature"
    }
    for label, col in cols.items():
        if col in df.columns and not df[col].isna().all():
            stats[label] = {
                "min":  float(df[col].min()),
                "max":  float(df[col].max()),
                "avg":  float(df[col].mean()),
                "current": float(df[col].iloc[-1]) if len(df) else None
            }
    return stats

def list_dirs(path: Path):
    return sorted([p.name for p in path.iterdir() if p.is_dir()])

# ──────────────────────────────────────────────────────────
# 1. Classic JSON / Log-analysis routes  (unchanged)
# ──────────────────────────────────────────────────────────
@app.post("/upload")
async def upload_tar(
    employee: str = Query(...),
    case_no: str = Query(...),
    file: UploadFile = File(...)
):
    if not file.filename.endswith(".tar"):
        return JSONResponse(400, {"error": "Only .tar files allowed"})
    root = Path(UPLOAD_DIR) / employee / case_no / today()
    root.mkdir(parents=True, exist_ok=True)

    base_name = Path(file.filename).stem
    tar_path = unique_path(root, base_name + ".tar")
    with open(tar_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    json_root = unique_path(root, "json")
    json_root.mkdir()

    try:
        parsed = extract_and_paginate_logs(str(tar_path), str(json_root))
        with open(json_root / "meta.json", "w") as mf:
            json.dump({
                "uploaded_at": datetime.now().isoformat(),
                "original": file.filename,
                "json_path": str(json_root.relative_to(root))
            }, mf, indent=2)
        tar_path.unlink(missing_ok=True)

        # REMOVE extracted subfolders related to the uploaded tar
        for sub in root.iterdir():
            if sub.is_dir() and sub.name.startswith(base_name):
                shutil.rmtree(sub, ignore_errors=True)

        return {"success": True, "modules": parsed.get("modules", []), "json_folder": json_root.name}
    except Exception as e:
        log.exception("tar processing failed")
        return JSONResponse(500, {"error": f"Parsing failed: {e}"})
    
    
@app.get("/list_uploads")
async def list_uploads(employee: str, case_no: str, date: str):
    root = Path(UPLOAD_DIR) / employee / case_no / date
    if not root.exists():
        return JSONResponse(status_code=404, content={"error": "Upload path not found."})
    folders = sorted(f.name for f in root.iterdir() if f.is_dir() and f.name.startswith("json"))
    display_names = {name: f"Tech_support_complete{idx if idx>0 else ''}" for idx, name in enumerate(folders)}
    return {"uploads": folders, "display_names": display_names}

@app.get("/list_chassis_jsons")
async def list_chassis_jsons(employee: str, case_no: str, date: str, folder: str):
    folder_path = Path(UPLOAD_DIR) / employee / case_no / date / folder
    if not folder_path.exists():
        raise HTTPException(status_code=404, detail="Folder not found")
    grouped = defaultdict(set)
    pattern = re.compile(r"(swlog_chassis\d+(?:\.\d+)?)_pg\d+\.json")
    for fname in os.listdir(folder_path):
        match = pattern.match(fname)
        if match:
            base = match.group(1)
            chassis_id = re.match(r"(swlog_chassis\d+)", base).group(1)
            grouped[chassis_id].add(base)
    return {"grouped_files": {k: sorted(v) for k,v in grouped.items()}}

@app.get("/load_json")
async def load_json_file(employee: str, case_no: str, date: str, folder: str, filename: str):
    file_path = Path(UPLOAD_DIR) / employee / case_no / date / folder / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return {"logs": data}

@app.get("/list_cases")
async def list_cases(employee: str, date: str):
    root = Path(UPLOAD_DIR) / employee
    if not root.exists():
        return {"cases": []}
    cases = sorted(c.name for c in root.iterdir() if (c / date).exists())
    return {"cases": cases}

@app.get("/list_hmon_files")
async def list_hmon_files(employee: str, case_no: str, date: str):
    root = Path(UPLOAD_DIR) / employee / case_no / date
    base_names = set()
    for folder in root.iterdir():
        if folder.is_dir() and folder.name.startswith("json"):
            for csv_file in (folder / "hmon_data" / "hmon_data").glob("*.csv"):
                base_names.add(csv_file.stem)
    return {"files": sorted(base_names)}

@app.get("/load_hmon")
async def load_hmon(employee: str, case_no: str, date: str, hmon_base: str):
    root = Path(UPLOAD_DIR) / employee / case_no / date
    all_data = []
    for folder in root.iterdir():
        if folder.is_dir() and folder.name.startswith("json"):
            deep = folder / "hmon_data" / "hmon_data"
            for csv_file in deep.glob(f"{hmon_base}*.csv"):
                try:
                    df = pd.read_csv(csv_file)
                    df.replace([np.nan, np.inf, -np.inf], None, inplace=True)
                    df = df.where(pd.notnull(df), None)
                    all_data.extend(df.to_dict(orient="records"))
                except Exception as e:
                    logger.warning(f"Failed to read CSV {csv_file}: {e}")
    return {"data": all_data}


@app.get("/check_hmon_available")
async def check_hmon_available(employee: str, case_no: str, date: str):
    for folder in (Path(UPLOAD_DIR) / employee / case_no / date).iterdir():
        if folder.is_dir() and (folder / "hmon_data" / "hmon_data").exists():
            return {"available": True}
    return {"available": False}

@app.get("/list_dates")
async def list_dates(employee: str, case_no: str):
    case_dir = Path(UPLOAD_DIR) / employee / case_no
    if not case_dir.exists():
        return {"dates": []}
    dates = sorted((d.name for d in case_dir.iterdir() if re.match(r"\d{4}-\d{2}-\d{2}", d.name)), reverse=True)
    return {"dates": dates}

@app.get("/cleanup_now")
async def cleanup_now(employee: str = Query(...), case_no: str = Query(...)):
    base = Path(UPLOAD_DIR) / employee / case_no
    if base.exists():
        shutil.rmtree(base, ignore_errors=True)
        return {"status": "deleted", "case": case_no}
    return {"status": "not_found", "case": case_no}

def generate_summary_stats(df):
    """Generate summary statistics for the dashboard"""
    stats = {}

    metrics = {
        "CPU Usage (%)": "cpu_usage",
        "Memory Usage (MB)": "memory_usage", 
        "Temperature (°C)": "temperature"
    }

    for label, col in metrics.items():
        if col in df.columns and not df[col].isna().all():
            stats[label] = {
                "min": df[col].min(),
                "max": df[col].max(), 
                "avg": df[col].mean(),
                "current": df[col].iloc[-1] if len(df) > 0 else None
            }

    return stats

# … list_cases, list_dates, list_uploads, list_chassis_jsons,
#   load_json_file, cleanup_now, check_hmon_available,
#   list_hmon_files, load_hmon, load_hmon_plots
# (EXACTLY as they existed in your old version – just paste them here)
# -------------------------------------------------------------------
# ⚠  For brevity they are omitted in this snippet, but you MUST copy
#    the unchanged implementations from your legacy backend below the
#    upload route.  Nothing needs editing there.
# -------------------------------------------------------------------

# ──────────────────────────────────────────────────────────
# 2. New selector APIs for the interactive dashboard
# ──────────────────────────────────────────────────────────
@app.get("/api/employees")
async def api_employees():                            return {"employees": list_dirs(Path(UPLOAD_DIR))}
@app.get("/api/cases")
async def api_cases(employee: str):                   return {"cases": list_dirs(Path(UPLOAD_DIR)/employee)}
@app.get("/api/dates")
async def api_dates(employee: str, case: str):        return {"dates": list_dirs(Path(UPLOAD_DIR)/employee/case)}
@app.get("/api/folders")
async def api_folders(employee: str, case: str, date: str):
    p = Path(UPLOAD_DIR)/employee/case/date
    return {"folders": [d for d in list_dirs(p) if ("json" in d or "hmon" in d.lower())]}

@app.get("/api/csv")
async def api_csv(employee: str, case: str, date: str, folder: str):
    roots = [
        Path(UPLOAD_DIR)/employee/case/date/folder/"hmon_data",
        Path(UPLOAD_DIR)/employee/case/date/folder,
        Path(UPLOAD_DIR)/employee/case/date/"json"/folder,
        Path(UPLOAD_DIR)/employee/case/date/"json"/folder/"hmon_data",
        Path(UPLOAD_DIR)/employee/case/date/"json"/"hmon_data"/"hmon_data"  # <--- required for you
    ]
    seen, out = set(), []
    for r in roots:
        if r.exists():
            for f in r.glob("*.csv"):
                if f.name not in seen:
                    out.append({"file": f.name, "full": str(f)})
                    seen.add(f.name)
    return {"csv_files": sorted(out, key=lambda x: x["file"])}

# ──────────────────────────────────────────────────────────
# 3. Dynamic dashboard JSON endpoint
# ──────────────────────────────────────────────────────────
@app.post("/api/analyse")
async def api_analyse(
    employee: str = Form(...),
    case: str = Form(...),
    date: str = Form(...),
    folder: str = Form(...),
    csv_file: str = Form(...)
):

    # Find the CSV file
    full = Path(csv_file) if Path(csv_file).exists() else None
    if not full:
        files = (await api_csv(employee, case, date, folder))["csv_files"]
        full = next((Path(o["full"]) for o in files if o["file"] == csv_file), None)
    
    if not (full and full.exists()):
        raise HTTPException(404, "CSV not found")
    
    # Use safe_read_csv directly and then process
    df = safe_read_csv(str(full))  # This returns a DataFrame
    
    # Add the processing logic from load_and_process_data directly here
    if 'time_stamp' in df.columns:
        df['time_stamp'] = pd.to_datetime(df['time_stamp'], format='%d %b %Y %H:%M:%S')
    
    if 'used' in df.columns and 'free' in df.columns:
        df['total_memory'] = df['used'] + df['free']
        df['memory_usage_pct'] = (df['used'] / df['total_memory']) * 100
    
    df.columns = df.columns.str.strip()
    
    # Generate dashboard components
    summ = dash.generate_dashboard_summary(df)
    
    return {
        "charts": {
            "overview": dash.create_system_overview_chart(df).to_json(),
            "fans": dash.create_detailed_fan_chart(df).to_json(),
            "memory": dash.create_memory_trend_chart(df).to_json()
        },
        "metrics": dash.create_real_time_metrics_html(summ),
        "stats": json.loads(json.dumps(summ, default=lambda o: o.item() if hasattr(o, "item") else o))
    }


# ──────────────────────────────────────────────────────────
# 4. HTML pages
# ──────────────────────────────────────────────────────────
# a) Legacy visualizer (uses plot_utils)

# b) New dynamic React/vanilla dashboard template
@app.get("/index.html", response_class=HTMLResponse)
async def serve_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login.html", response_class=HTMLResponse)
async def serve_index(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dynamic_hmon_dashboard.html", response_class=HTMLResponse)
async def serve_index(request: Request):
    return templates.TemplateResponse("dynamic_hmon_dashboard.html", {"request": request})

# ──────────────────────────────────────────────────────────
# 5. Front-end static mount
# ──────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")
app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")

# ──────────────────────────────────────────────────────────
# 6. Uvicorn entry-point
# ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
