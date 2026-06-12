"""BGM動画ファクトリー — ローカルWebアプリ本体。

起動: uvicorn app.main:app --reload
"""
import json
import shutil
import threading
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import metadata as meta
from . import processing

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UPLOADS = DATA / "uploads"
OUTPUTS = DATA / "outputs"
JOBS_FILE = DATA / "jobs.json"
for d in (UPLOADS, OUTPUTS):
    d.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="BGM動画ファクトリー")
_lock = threading.Lock()


def _load_jobs() -> dict:
    if JOBS_FILE.exists():
        return json.loads(JOBS_FILE.read_text())
    return {}


def _save_jobs(jobs: dict) -> None:
    JOBS_FILE.write_text(json.dumps(jobs, ensure_ascii=False, indent=2))


def _update_job(job_id: str, **fields) -> None:
    with _lock:
        jobs = _load_jobs()
        jobs[job_id].update(fields)
        _save_jobs(jobs)


@app.post("/api/upload")
async def upload(file: UploadFile, kind: str = Form(...)):
    if kind not in ("audio", "image"):
        raise HTTPException(400, "kind must be audio or image")
    ext = Path(file.filename or "f").suffix or (".mp3" if kind == "audio" else ".png")
    name = f"{kind}_{uuid.uuid4().hex[:8]}{ext}"
    dest = UPLOADS / name
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": name, "original": file.filename}


@app.post("/api/metadata")
async def gen_metadata(theme: str = Form(...), genre: str = Form(...), minutes: int = Form(60)):
    return meta.generate(theme, genre, minutes)


@app.post("/api/jobs")
async def create_job(
    audio: str = Form(...),
    image: str = Form(...),
    minutes: int = Form(60),
    effect: str = Form("zoom"),
    title: str = Form(""),
):
    audio_path = UPLOADS / audio
    image_path = UPLOADS / image
    if not audio_path.exists() or not image_path.exists():
        raise HTTPException(404, "uploaded file not found")

    job_id = uuid.uuid4().hex[:12]
    with _lock:
        jobs = _load_jobs()
        jobs[job_id] = {
            "id": job_id, "status": "queued", "progress": "待機中",
            "title": title or audio, "minutes": minutes,
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "output": None, "error": None,
        }
        _save_jobs(jobs)

    threading.Thread(
        target=_render, args=(job_id, audio_path, image_path, minutes, effect),
        daemon=True,
    ).start()
    return {"id": job_id}


def _render(job_id: str, audio: Path, image: Path, minutes: int, effect: str) -> None:
    try:
        _update_job(job_id, status="running", progress="音声をループ伸長中...")
        extended = OUTPUTS / f"{job_id}_audio.m4a"
        processing.extend_audio(audio, extended, minutes)

        _update_job(job_id, progress="動画をレンダリング中...")
        out = OUTPUTS / f"{job_id}.mp4"
        processing.render_video(image, extended, out, effect)
        extended.unlink(missing_ok=True)

        _update_job(job_id, status="done", progress="完了", output=out.name)
    except Exception as e:
        _update_job(job_id, status="error", progress="失敗", error=str(e)[-1000:])


@app.get("/api/jobs")
async def list_jobs():
    jobs = _load_jobs()
    return sorted(jobs.values(), key=lambda j: j["created_at"], reverse=True)


@app.get("/api/download/{name}")
async def download(name: str):
    path = OUTPUTS / Path(name).name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="video/mp4", filename=path.name)


app.mount("/", StaticFiles(directory=ROOT / "static", html=True), name="static")
