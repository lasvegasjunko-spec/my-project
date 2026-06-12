"""YouTube Data API v3 連携 — OAuth2 認証・動画アップロード・予約投稿。"""
import json
import os
import pickle
from datetime import datetime, timezone
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
TOKEN_FILE = Path(__file__).resolve().parent.parent / "data" / "yt_token.pkl"
CREDS_FILE = Path(__file__).resolve().parent.parent / "data" / "client_secrets.json"


def _get_credentials():
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if TOKEN_FILE.exists():
        with TOKEN_FILE.open("rb") as f:
            creds = pickle.load(f)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        if not CREDS_FILE.exists():
            raise FileNotFoundError(
                "data/client_secrets.json が見つかりません。"
                "Google Cloud Console からOAuth2クライアントIDをダウンロードして配置してください。"
            )
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_FILE), SCOPES)
        creds = flow.run_local_server(port=8765, open_browser=False)

    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    with TOKEN_FILE.open("wb") as f:
        pickle.dump(creds, f)

    return creds


def get_auth_url() -> str:
    """OAuth2 認証URLを返す（ブラウザで開いてもらう）。"""
    from google_auth_oauthlib.flow import Flow

    if not CREDS_FILE.exists():
        raise FileNotFoundError("data/client_secrets.json が見つかりません。")

    flow = Flow.from_client_secrets_file(
        str(CREDS_FILE), SCOPES,
        redirect_uri="http://localhost:8000/api/youtube/callback"
    )
    auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
    return auth_url


def handle_callback(code: str) -> None:
    """OAuth2コールバックのcodeをトークンに交換して保存。"""
    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_secrets_file(
        str(CREDS_FILE), SCOPES,
        redirect_uri="http://localhost:8000/api/youtube/callback"
    )
    flow.fetch_token(code=code)
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    with TOKEN_FILE.open("wb") as f:
        pickle.dump(flow.credentials, f)


def is_authenticated() -> bool:
    if not TOKEN_FILE.exists():
        return False
    try:
        from google.auth.transport.requests import Request
        with TOKEN_FILE.open("rb") as f:
            creds = pickle.load(f)
        if creds.valid:
            return True
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with TOKEN_FILE.open("wb") as f:
                pickle.dump(creds, f)
            return True
    except Exception:
        pass
    return False


def upload_video(
    video_path: Path,
    title: str,
    description: str,
    tags: list[str],
    publish_at: datetime | None = None,
) -> str:
    """動画をアップロードして video_id を返す。publish_at を指定すると予約投稿。"""
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    creds = _get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    status = {
        "privacyStatus": "private" if publish_at else "public",
    }
    if publish_at:
        if publish_at.tzinfo is None:
            publish_at = publish_at.replace(tzinfo=timezone.utc)
        status["publishAt"] = publish_at.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags[:500],
            "categoryId": "10",  # Music
        },
        "status": status,
    }

    media = MediaFileUpload(str(video_path), mimetype="video/mp4", resumable=True, chunksize=10 * 1024 * 1024)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        _, response = request.next_chunk()

    return response["id"]
