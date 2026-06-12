"""ffmpeg を使った音声伸長と動画レンダリング。"""
import subprocess
from pathlib import Path


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr[-2000:]}")


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def extend_audio(src: Path, dst: Path, target_minutes: int, crossfade_sec: float = 3.0) -> None:
    """曲をクロスフェードでループさせて target_minutes の長さに伸ばし、音量を正規化する。"""
    duration = probe_duration(src)
    target_sec = target_minutes * 60
    loops = max(0, int(target_sec / max(duration - crossfade_sec, 1)) + 1)

    # acrossfade をチェーンして自然なループを作る
    inputs: list[str] = []
    for _ in range(loops + 1):
        inputs += ["-i", str(src)]

    if loops == 0:
        filter_complex = "[0:a]"
        last = "[0:a]"
    else:
        parts = []
        last = "[0:a]"
        for i in range(1, loops + 1):
            out_label = f"[a{i}]"
            parts.append(f"{last}[{i}:a]acrossfade=d={crossfade_sec}:c1=tri:c2=tri{out_label}")
            last = out_label
        filter_complex = ";".join(parts)

    filter_complex += f";{last}atrim=0:{target_sec},loudnorm=I=-16:TP=-1.5:LRA=11[out]"

    run(["ffmpeg", "-y", *inputs,
         "-filter_complex", filter_complex,
         "-map", "[out]", "-c:a", "aac", "-b:a", "192k", str(dst)])


def render_video(image: Path, audio: Path, dst: Path, effect: str = "zoom") -> None:
    """ジャケット画像 + 長尺音声 → YouTube 用 mp4。"""
    if effect == "zoom":
        # ゆっくりズームイン（25fps、1080p）
        vf = ("scale=2160:2160:force_original_aspect_ratio=increase,"
              "crop=2160:2160,"
              "zoompan=z='min(zoom+0.00004,1.15)':d=125000:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1080:fps=25,"
              "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black")
    else:
        vf = ("scale=1920:1080:force_original_aspect_ratio=decrease,"
              "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black")

    run(["ffmpeg", "-y",
         "-loop", "1", "-framerate", "25", "-i", str(image),
         "-i", str(audio),
         "-vf", vf,
         "-c:v", "libx264", "-tune", "stillimage", "-preset", "veryfast",
         "-crf", "23", "-pix_fmt", "yuv420p",
         "-c:a", "copy",
         "-shortest", "-movflags", "+faststart",
         str(dst)])
