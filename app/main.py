"""BGM動画ファクトリー — ローカルWebアプリ本体。

起動: uvicorn app.main:app --reload
"""
import json
import shutil
import threading
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, UploadFile, Form, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from . import metadata as meta
from . import processing
from . import youtube as yt

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


# ── サムネイル文字入れ ────────────────────────────────────────────
@app.post("/api/thumbnail")
async def make_thumbnail(
    image: str = Form(...),
    lines: str = Form(...),   # 改行区切りのテキスト
    font_size: int = Form(80),
):
    src = UPLOADS / image
    if not src.exists():
        raise HTTPException(404, "image not found")
    name = f"thumb_{uuid.uuid4().hex[:8]}{src.suffix}"
    dst = UPLOADS / name
    text_lines = [l.strip() for l in lines.strip().splitlines() if l.strip()]
    processing.overlay_text(src, dst, text_lines, font_size)
    return {"filename": name}


# ── ジョブ ────────────────────────────────────────────────────────
@app.post("/api/jobs")
async def create_job(
    audio: str = Form(...),          # カンマ区切りで複数可
    image: str = Form(...),
    minutes: int = Form(60),
    effect: str = Form("zoom"),
    title: str = Form(""),
    thumb_lines: str = Form(""),     # サムネ文字（改行区切り）
    publish_at: str = Form(""),      # ISO8601 予約投稿日時（空=即公開 or 手動）
):
    audio_names = [a.strip() for a in audio.split(",") if a.strip()]
    audio_paths = [UPLOADS / a for a in audio_names]
    image_path = UPLOADS / image

    for p in audio_paths + [image_path]:
        if not p.exists():
            raise HTTPException(404, f"uploaded file not found: {p.name}")

    job_id = uuid.uuid4().hex[:12]
    with _lock:
        jobs = _load_jobs()
        jobs[job_id] = {
            "id": job_id, "status": "queued", "progress": "待機中",
            "title": title or audio_names[0], "minutes": minutes,
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "output": None, "error": None,
            "youtube_id": None,
        }
        _save_jobs(jobs)

    threading.Thread(
        target=_render,
        args=(job_id, audio_paths, image_path, minutes, effect, thumb_lines, publish_at),
        daemon=True,
    ).start()
    return {"id": job_id}


def _render(
    job_id: str,
    audios: list[Path],
    image: Path,
    minutes: int,
    effect: str,
    thumb_lines: str,
    publish_at_str: str,
) -> None:
    try:
        _update_job(job_id, status="running", progress="音声をループ伸長中...")
        extended = OUTPUTS / f"{job_id}_audio.m4a"

        if len(audios) > 1:
            processing.mix_audios(audios, extended, minutes)
        else:
            processing.extend_audio(audios[0], extended, minutes)

        # サムネ文字入れ
        render_image = image
        lines = [l.strip() for l in thumb_lines.strip().splitlines() if l.strip()]
        if lines:
            _update_job(job_id, progress="サムネイルにテキストを合成中...")
            thumb_out = OUTPUTS / f"{job_id}_thumb{image.suffix}"
            processing.overlay_text(image, thumb_out, lines)
            render_image = thumb_out

        _update_job(job_id, progress="動画をレンダリング中...")
        out = OUTPUTS / f"{job_id}.mp4"
        processing.render_video(render_image, extended, out, effect)
        extended.unlink(missing_ok=True)

        _update_job(job_id, status="done", progress="完了", output=out.name)

        # YouTube 自動アップロード
        if publish_at_str and yt.is_authenticated():
            _upload_to_youtube(job_id, out, publish_at_str)

    except Exception as e:
        _update_job(job_id, status="error", progress="失敗", error=str(e)[-1000:])


def _upload_to_youtube(job_id: str, video: Path, publish_at_str: str) -> None:
    try:
        _update_job(job_id, progress="YouTubeにアップロード中...")
        jobs = _load_jobs()
        j = jobs[job_id]

        publish_dt = None
        if publish_at_str and publish_at_str.lower() not in ("", "now", "public"):
            from datetime import datetime as dt
            try:
                publish_dt = dt.fromisoformat(publish_at_str)
            except ValueError:
                pass

        vid_id = yt.upload_video(
            video_path=video,
            title=j.get("title", video.stem),
            description=j.get("description", ""),
            tags=j.get("tags", []),
            publish_at=publish_dt,
        )
        _update_job(job_id, youtube_id=vid_id, progress=f"YouTube投稿済み: {vid_id}")
    except Exception as e:
        _update_job(job_id, progress=f"完了（YouTube失敗: {str(e)[:200]}）")


@app.get("/api/jobs")
async def list_jobs():
    jobs = _load_jobs()
    return sorted(jobs.values(), key=lambda j: j["created_at"], reverse=True)


@app.get("/api/thumb_preview/{name}")
async def thumb_preview(name: str):
    path = UPLOADS / Path(name).name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)


@app.get("/api/download/{name}")
async def download(name: str):
    path = OUTPUTS / Path(name).name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="video/mp4", filename=path.name)


# ── YouTube OAuth2 ────────────────────────────────────────────────
@app.get("/api/youtube/status")
async def yt_status():
    has_secrets = (DATA / "client_secrets.json").exists()
    authenticated = yt.is_authenticated() if has_secrets else False
    return {"has_secrets": has_secrets, "authenticated": authenticated}


@app.get("/api/youtube/auth")
async def yt_auth():
    try:
        url = yt.get_auth_url()
        return {"url": url}
    except FileNotFoundError as e:
        raise HTTPException(400, str(e))


@app.get("/api/youtube/callback")
async def yt_callback(code: str = Query(...)):
    try:
        yt.handle_callback(code)
        return RedirectResponse("/?yt_auth=ok")
    except Exception as e:
        raise HTTPException(400, str(e))


app.mount("/", StaticFiles(directory=ROOT / "static", html=True), name="static")
