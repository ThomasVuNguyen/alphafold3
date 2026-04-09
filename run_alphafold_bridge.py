#!/usr/bin/env python3
"""
AlphaFold 3 Bridge Orchestrator

This script connects the CPU-only data pipeline running locally on your home server (thomas-zenbook)
with the GPU inference pipeline running on the cloud via Modal.

Workflow:
1. Reads local fold_input.json
2. Securely pushes the sequence to the home server via SSH.
3. Home server searches AlphaFold databases (600GB) natively on CPU, generating MSAs.
4. Downloads the enriched `_data.json` output back to the Mac.
5. Submits the enriched JSON to Modal's A100 GPUs for diffusion structure prediction.
6. Downloads final .cif files.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import uuid
import pathlib

REMOTE_SERVER = "root@thomas-zenbook"
REMOTE_AF3_DIR = "/root/alphafold3"
REMOTE_DB_DIR = "/root/af3_databases"

def run_remote_command(cmd_str):
    print(f"📡 Running remote command: {cmd_str}")
    cmd = ["ssh", REMOTE_SERVER, cmd_str]
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0:
        print(f"❌ Remote command failed with exit code {result.returncode}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="End-to-End AlphaFold 3 Hybrid Runner")
    parser.add_argument("--json_path", type=str, required=True, help="Path to input JSON file")
    parser.add_argument("--output_dir", type=str, default="./af3_final_output", help="Path to output directory")
    args = parser.parse_args()

    input_path = pathlib.Path(args.json_path).expanduser()
    if not input_path.exists():
        print(f"❌ Input file not found: {input_path}")
        sys.exit(1)

    try:
        with open(input_path, 'r') as f:
            input_json = json.load(f)
    except Exception as e:
        print(f"❌ Could not parse JSON: {e}")
        sys.exit(1)

    # Note: AF3 inputs are usually arrays
    if isinstance(input_json, list) and len(input_json) > 0:
        job_name = input_json[0].get("name", "unnamed_job")
    else:
        job_name = input_json.get("name", "unnamed_job")

    print(f"🧬 Starting hybrid pipeline for job: {job_name}")

    # Create a unique working directory on the remote server
    run_uuid = str(uuid.uuid4())
    remote_work_dir = f"/root/af3_bridge_tmp/{run_uuid}"
    run_remote_command(f"mkdir -p {remote_work_dir}")

    # Transfer the input file to the remote server
    remote_input_path = f"{remote_work_dir}/input.json"
    print(f"⬆️ Uploading {input_path.name} to {REMOTE_SERVER}:{remote_input_path}")
    subprocess.run(["scp", str(input_path), f"{REMOTE_SERVER}:{remote_input_path}"], check=True)

    # Run the CPU data pipeline
    print("⏳ Executing Data Pipeline on home server...")
    af3_cmd = (
        f"cd {REMOTE_AF3_DIR} && "
        f"export PATH=\"/root/.local/bin:/usr/local/hmmer/bin:$PATH\" && "
        f"export UV_PROJECT_ENVIRONMENT={REMOTE_AF3_DIR}/alphafold3_venv && "
        f"uv run python run_alphafold.py "
        f"--json_path {remote_input_path} "
        f"--db_dir {REMOTE_DB_DIR} "
        f"--output_dir {remote_work_dir} "
        f"--run_data_pipeline=True "
        f"--run_inference=False"
    )
    run_remote_command(af3_cmd)

    # AF3 script creates a folder named after the job name inside the output dir
    # we expect the output to be inside {remote_work_dir}/{job_name}/{job_name}_data.json
    remote_data_json = f"{remote_work_dir}/{job_name}/{job_name}_data.json"
    
    # Download the generated data JSON
    print(f"⬇️ Downloading intermediate data JSON from home server...")
    with tempfile.TemporaryDirectory() as local_tmp:
        local_data_json = pathlib.Path(local_tmp) / f"{job_name}_data.json"
        scp_cmd = ["scp", f"{REMOTE_SERVER}:{remote_data_json}", str(local_data_json)]
        result = subprocess.run(scp_cmd, text=True)
        if result.returncode != 0:
            print("❌ Failed to download preprocessed _data.json from server!")
            # cleanup
            run_remote_command(f"rm -rf {remote_work_dir}")
            sys.exit(1)

        print(f"✅ Downloaded intermediate data JSON! Size: {local_data_json.stat().st_size / 1e6:.2f} MB")
        
        # Cleanup remote
        run_remote_command(f"rm -rf {remote_work_dir}")

        # Run Modal Inference
        print("\n🚀 Handing over to Modal for GPU Inference...")
        modal_cmd = [
            sys.executable, "-m", "modal", "run", "modal_af3.py::predict",
            "--input-json", str(local_data_json),
            "--output-dir", args.output_dir
        ]
        print(f"Running: {' '.join(modal_cmd)}")
        
        # Execute Modal subprocess directly, streaming output to console
        modal_result = subprocess.run(modal_cmd)
        
        if modal_result.returncode != 0:
            print("❌ Modal prediction failed!")
            sys.exit(1)
        else:
            print(f"🎉 Hybrid pipeline complete! Results are in: {args.output_dir}")

if __name__ == "__main__":
    main()
