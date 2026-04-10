"""
AlphaFold 3 Visualization API Server

This FastAPI server provides a REST API for the AlphaFold3 visualization frontend.
All pipeline execution (Modal, SSH) happens server-side — no cloud URLs are ever
exposed to the client, in compliance with AlphaFold3 Terms of Use.

Usage:
    uvicorn api_server:app --reload --port 8000
"""

import csv
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR = pathlib.Path(__file__).parent
PREDICTIONS_DIR = BASE_DIR / "final_predictions"
BRIDGE_SCRIPT = BASE_DIR / "run_alphafold_bridge.py"

# In-memory job tracker (survives hot-reload, lost on full restart)
JOBS: dict[str, dict] = {}

app = FastAPI(
    title="AlphaFold3 Visualizer API",
    description="Serves prediction results. Modal/cloud URLs are server-side only.",
    version="1.0.0",
)

# CORS — allow local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_prediction_dir(name: str) -> pathlib.Path:
    """Resolve and validate a prediction directory."""
    pred_dir = PREDICTIONS_DIR / name
    if not pred_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Prediction '{name}' not found")
    return pred_dir


def _read_json(path: pathlib.Path) -> dict:
    """Read and parse a JSON file."""
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path.name}")
    with open(path, "r") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Routes — Prediction Browsing
# ---------------------------------------------------------------------------
@app.get("/api/predictions")
def list_predictions():
    """List all completed predictions with summary metrics."""
    if not PREDICTIONS_DIR.is_dir():
        return {"predictions": []}

    predictions = []
    for d in sorted(PREDICTIONS_DIR.iterdir()):
        if not d.is_dir():
            continue

        name = d.name
        summary_file = d / f"{name}_summary_confidences.json"
        model_file = d / f"{name}_model.cif"

        entry = {
            "name": name,
            "has_structure": model_file.exists(),
            "has_confidences": summary_file.exists(),
            "summary": None,
            "samples": [],
        }

        # Load summary if available
        if summary_file.exists():
            with open(summary_file, "r") as f:
                entry["summary"] = json.load(f)

        # Count seed/sample subdirectories
        for sub in sorted(d.iterdir()):
            if sub.is_dir() and sub.name.startswith("seed-"):
                entry["samples"].append(sub.name)

        predictions.append(entry)

    return {"predictions": predictions}


@app.get("/api/predictions/{name}")
def get_prediction(name: str):
    """Get detailed info for a single prediction."""
    pred_dir = _get_prediction_dir(name)

    result = {
        "name": name,
        "summary": None,
        "ranking_scores": None,
        "input_data": None,
        "samples": [],
        "files": [],
    }

    # Summary confidences
    summary_file = pred_dir / f"{name}_summary_confidences.json"
    if summary_file.exists():
        result["summary"] = _read_json(summary_file)

    # Ranking scores CSV -> JSON
    ranking_file = pred_dir / f"{name}_ranking_scores.csv"
    if ranking_file.exists():
        with open(ranking_file, "r") as f:
            reader = csv.DictReader(f)
            result["ranking_scores"] = [row for row in reader]

    # Input data JSON
    data_file = pred_dir / f"{name}_data.json"
    if data_file.exists():
        result["input_data"] = _read_json(data_file)

    # List all files
    for f in sorted(pred_dir.iterdir()):
        if f.is_file():
            result["files"].append({
                "name": f.name,
                "size_bytes": f.stat().st_size,
                "type": f.suffix,
            })

    # List samples
    for sub in sorted(pred_dir.iterdir()):
        if sub.is_dir() and sub.name.startswith("seed-"):
            sample_info = {"name": sub.name, "files": []}
            for sf in sorted(sub.iterdir()):
                if sf.is_file():
                    sample_info["files"].append(sf.name)
            result["samples"].append(sample_info)

    return result


@app.get("/api/predictions/{name}/confidences")
def get_confidences(name: str, sample: Optional[str] = None):
    """Get full confidence data (pLDDT per-atom, PAE matrix, contact probs).
    
    Query params:
        sample: e.g. "seed-1_sample-0" for a specific sample variant
    """
    pred_dir = _get_prediction_dir(name)

    if sample:
        conf_file = pred_dir / sample / f"{name}_{sample}_confidences.json"
    else:
        conf_file = pred_dir / f"{name}_confidences.json"

    return _read_json(conf_file)


@app.get("/api/predictions/{name}/structure")
def get_structure(name: str, sample: Optional[str] = None):
    """Serve the CIF structure file for 3D rendering.

    Query params:
        sample: e.g. "seed-1_sample-0" for a specific sample variant
    """
    pred_dir = _get_prediction_dir(name)

    if sample:
        cif_file = pred_dir / sample / f"{name}_{sample}_model.cif"
    else:
        cif_file = pred_dir / f"{name}_model.cif"

    if not cif_file.exists():
        raise HTTPException(status_code=404, detail="CIF file not found")

    return FileResponse(
        cif_file,
        media_type="chemical/x-cif",
        filename=cif_file.name,
    )


@app.get("/api/predictions/{name}/ranking")
def get_ranking(name: str):
    """Get ranking scores as JSON."""
    pred_dir = _get_prediction_dir(name)
    ranking_file = pred_dir / f"{name}_ranking_scores.csv"

    if not ranking_file.exists():
        raise HTTPException(status_code=404, detail="Ranking scores not found")

    with open(ranking_file, "r") as f:
        reader = csv.DictReader(f)
        rows = [row for row in reader]

    return {"ranking_scores": rows}


# ---------------------------------------------------------------------------
# Routes — Pipeline Execution (server-side only, no cloud URLs exposed)
# ---------------------------------------------------------------------------
def _run_bridge_job(job_id: str, input_path: pathlib.Path, output_dir: pathlib.Path):
    """Background thread that runs the bridge script and updates job status."""
    job = JOBS[job_id]
    job["status"] = "running"
    job["stage"] = "data_pipeline"
    job["started_at"] = datetime.now(timezone.utc).isoformat()

    try:
        proc = subprocess.Popen(
            [
                sys.executable,
                str(BRIDGE_SCRIPT),
                "--json_path", str(input_path),
                "--output_dir", str(output_dir),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        logs = []
        for line in proc.stdout:
            line = line.rstrip()
            logs.append(line)
            job["logs"] = logs[-200:]  # keep last 200 lines

            # Detect stage transitions from bridge output
            if "Executing Data Pipeline" in line:
                job["stage"] = "data_pipeline"
            elif "Downloading intermediate" in line:
                job["stage"] = "downloading_msa"
            elif "Handing over to Modal" in line:
                job["stage"] = "gpu_inference"
            elif "Hybrid pipeline complete" in line:
                job["stage"] = "complete"

        proc.wait()

        if proc.returncode == 0:
            job["status"] = "succeeded"
            job["stage"] = "complete"
        else:
            job["status"] = "failed"
            job["error"] = f"Bridge script exited with code {proc.returncode}"

    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)
    finally:
        job["finished_at"] = datetime.now(timezone.utc).isoformat()
        # Clean up temp input file
        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.post("/api/predict")
async def trigger_prediction(request: Request):
    """
    Trigger a new AlphaFold3 prediction.

    SECURITY: The bridge script and Modal invocation happen entirely server-side.
    No Modal URLs, API keys, or cloud endpoints are ever sent to the client.
    This complies with AlphaFold3 Terms of Use regarding model distribution.

    Expects JSON body matching AlphaFold3 input format:
        {"sequences": [...], "name": "my_protein", ...}
    or an array of such objects.
    """
    payload = await request.json()
    # --- Validate input ------------------------------------------------
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")

    # Extract job name
    if isinstance(payload, list) and len(payload) > 0:
        job_name = payload[0].get("name", "unnamed")
    elif isinstance(payload, dict):
        job_name = payload.get("name", "unnamed")
    else:
        raise HTTPException(status_code=400, detail="Payload must be a JSON object or array")

    if not BRIDGE_SCRIPT.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Bridge script not found at {BRIDGE_SCRIPT}",
        )

    # --- Write temp input file -----------------------------------------
    job_id = str(uuid.uuid4())[:8]
    tmp_dir = pathlib.Path(tempfile.gettempdir()) / "af3_jobs"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    input_path = tmp_dir / f"{job_id}_input.json"

    with open(input_path, "w") as f:
        json.dump(payload, f, indent=2)

    output_dir = PREDICTIONS_DIR  # results land in final_predictions/

    # --- Register job --------------------------------------------------
    JOBS[job_id] = {
        "job_id": job_id,
        "name": job_name,
        "status": "queued",
        "stage": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "finished_at": None,
        "error": None,
        "logs": [],
    }

    # --- Launch in background thread -----------------------------------
    thread = threading.Thread(
        target=_run_bridge_job,
        args=(job_id, input_path, output_dir),
        daemon=True,
    )
    thread.start()

    return {
        "job_id": job_id,
        "name": job_name,
        "status": "queued",
        "message": f"Pipeline started. Poll GET /api/jobs/{job_id} for status.",
    }


@app.get("/api/jobs")
def list_jobs():
    """List all tracked jobs."""
    return {"jobs": list(JOBS.values())}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    """Get the status and logs of a running/completed job."""
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return JOBS[job_id]


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "predictions_dir": str(PREDICTIONS_DIR),
        "prediction_count": len([d for d in PREDICTIONS_DIR.iterdir() if d.is_dir()]) if PREDICTIONS_DIR.is_dir() else 0,
    }
