"""ffmpeg を使った音声伸長と動画レンダリング。"""
from __future__ import annotations

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


def mix_audios(srcs: list[Path], dst: Path, target_minutes: int, crossfade_sec: float = 3.0) -> None:
    """複数曲をクロスフェードで連結して target_minutes に伸ばし正規化する。"""
    if len(srcs) == 1:
        extend_audio(srcs[0], dst, target_minutes, crossfade_sec)
        return

    target_sec = target_minutes * 60

    # 全曲を連結 → 必要回数ループして target_sec に達するまで繰り返す
    concat_inputs: list[str] = []
    for s in srcs:
        concat_inputs += ["-i", str(s)]

    n = len(srcs)
    concat_filter = "".join(f"[{i}:a]" for i in range(n))
    concat_filter += f"concat=n={n}:v=0:a=1[cat]"

    # concat した結果を一時 m4a に書き出す
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as tf:
        tmp = Path(tf.name)

    run(["ffmpeg", "-y", *concat_inputs,
         "-filter_complex", concat_filter,
         "-map", "[cat]", "-c:a", "aac", "-b:a", "192k", str(tmp)])

    # 一時ファイルを素材として extend_audio でループ伸長
    try:
        extend_audio(tmp, dst, target_minutes, crossfade_sec)
    finally:
        tmp.unlink(missing_ok=True)


def overlay_text(src: Path, dst: Path, lines: list[str], font_size: int = 80) -> None:
    """Pillow でサムネイル画像にテキストを重ねる（白文字＋黒縁）。"""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)

    # システムフォントを探す（なければデフォルト）
    font_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
    ]
    font = None
    for fc in font_candidates:
        if Path(fc).exists():
            try:
                font = ImageFont.truetype(fc, font_size)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    total_h = len(lines) * (font_size + 10)
    y = h - total_h - 40

    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        x = (w - tw) // 2
        # 縁取り
        for dx, dy in [(-3, -3), (3, -3), (-3, 3), (3, 3)]:
            draw.text((x + dx, y + dy), line, font=font, fill=(0, 0, 0, 255))
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))
        y += font_size + 10

    out = img.convert("RGB")
    out.save(str(dst))


def render_video(image: Path, audio: Path, dst: Path, effect: str = "zoom") -> None:
    """ジャケット画像 + 長尺音声 → YouTube 用 mp4。"""
    if effect == "zoom":
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
