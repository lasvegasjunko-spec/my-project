#!/usr/bin/env python3
"""
LINE スタンプ作成スクリプト
スタンプシート画像を個別PNG(370×320px)に分割します。

使い方:
    python3 split_stickers.py <画像ファイル> [オプション]

例:
    python3 split_stickers.py chiyoko.jpg --preview
    python3 split_stickers.py chiyoko.jpg --gap_x 10 --gap_y 10 --preview
    python3 split_stickers.py chiyoko.jpg --gap_x 10 --gap_y 10
"""

import argparse
import os
from pathlib import Path

from PIL import Image, ImageDraw

LINE_WIDTH = 370
LINE_HEIGHT = 320


def split_sticker_sheet(
    image_path: str,
    rows: int,
    cols: int,
    output_dir: str,
    gap_x: int = 0,
    gap_y: int = 0,
    margin: int = 0,
) -> list[Path]:
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    print(f"入力画像サイズ: {w}x{h}px  /  グリッド: {rows}行 × {cols}列")

    inner_w = w - margin * 2
    inner_h = h - margin * 2
    cell_w = (inner_w - gap_x * (cols - 1)) // cols
    cell_h = (inner_h - gap_y * (rows - 1)) // rows

    print(f"1コマのサイズ: {cell_w}x{cell_h}px  (gap_x={gap_x}, gap_y={gap_y}, margin={margin})")

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    paths = []
    n = 1
    for row in range(rows):
        for col in range(cols):
            left = margin + col * (cell_w + gap_x)
            top = margin + row * (cell_h + gap_y)
            right = left + cell_w
            bottom = top + cell_h

            cell = img.crop((left, top, right, bottom))
            cell = remove_white_background(cell)

            cell.thumbnail((LINE_WIDTH, LINE_HEIGHT), Image.LANCZOS)
            canvas = Image.new("RGBA", (LINE_WIDTH, LINE_HEIGHT), (0, 0, 0, 0))
            x = (LINE_WIDTH - cell.width) // 2
            y = (LINE_HEIGHT - cell.height) // 2
            canvas.paste(cell, (x, y), cell)

            filename = out / f"sticker_{n:02d}.png"
            canvas.save(filename, "PNG")
            print(f"  保存: {filename}")
            paths.append(filename)
            n += 1

    return paths


def save_preview(
    image_path: str,
    rows: int,
    cols: int,
    gap_x: int = 0,
    gap_y: int = 0,
    margin: int = 0,
) -> str:
    """グリッド線を重ねたプレビュー画像を保存する"""
    img = Image.open(image_path).convert("RGB")
    w, h = img.size

    inner_w = w - margin * 2
    inner_h = h - margin * 2
    cell_w = (inner_w - gap_x * (cols - 1)) // cols
    cell_h = (inner_h - gap_y * (rows - 1)) // rows

    draw = ImageDraw.Draw(img)
    for row in range(rows):
        for col in range(cols):
            left = margin + col * (cell_w + gap_x)
            top = margin + row * (cell_h + gap_y)
            right = left + cell_w
            bottom = top + cell_h
            draw.rectangle([left, top, right - 1, bottom - 1], outline="red", width=3)
            n = row * cols + col + 1
            draw.text((left + 6, top + 4), str(n), fill="red")

    out_path = Path(image_path).stem + "_preview.jpg"
    img.save(out_path)
    print(f"プレビュー保存: {out_path}")
    return out_path


def remove_white_background(img: Image.Image, threshold: int = 240) -> Image.Image:
    import numpy as np
    img = img.convert("RGBA")
    arr = np.array(img)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    white_mask = (r >= threshold) & (g >= threshold) & (b >= threshold)
    arr[white_mask, 3] = 0
    return Image.fromarray(arr, "RGBA")


def make_main_image(sticker_path: str, output_dir: str) -> Path:
    img = Image.open(sticker_path).convert("RGBA")
    img.thumbnail((240, 240), Image.LANCZOS)
    canvas = Image.new("RGBA", (240, 240), (0, 0, 0, 0))
    x = (240 - img.width) // 2
    y = (240 - img.height) // 2
    canvas.paste(img, (x, y), img)
    out = Path(output_dir) / "main.png"
    canvas.save(out, "PNG")
    print(f"メイン画像: {out}")
    return out


def make_tab_image(sticker_path: str, output_dir: str) -> Path:
    img = Image.open(sticker_path).convert("RGBA")
    img.thumbnail((96, 74), Image.LANCZOS)
    canvas = Image.new("RGBA", (96, 74), (0, 0, 0, 0))
    x = (96 - img.width) // 2
    y = (74 - img.height) // 2
    canvas.paste(img, (x, y), img)
    out = Path(output_dir) / "tab.png"
    canvas.save(out, "PNG")
    print(f"タブ画像: {out}")
    return out


def main():
    parser = argparse.ArgumentParser(description="LINEスタンプシート分割ツール")
    parser.add_argument("image", help="スタンプシートの画像ファイル")
    parser.add_argument("--rows", type=int, default=4, help="行数 (デフォルト: 4)")
    parser.add_argument("--cols", type=int, default=6, help="列数 (デフォルト: 6)")
    parser.add_argument("--gap_x", type=int, default=0, help="コマ間の横の隙間px (デフォルト: 0)")
    parser.add_argument("--gap_y", type=int, default=0, help="コマ間の縦の隙間px (デフォルト: 0)")
    parser.add_argument("--margin", type=int, default=0, help="画像外側の余白px (デフォルト: 0)")
    parser.add_argument("--out", default="line_stickers", help="出力フォルダ (デフォルト: line_stickers)")
    parser.add_argument("--preview", action="store_true", help="分割位置を確認するプレビュー画像を保存")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"エラー: ファイルが見つかりません: {args.image}")
        return

    if args.preview:
        print("\n=== プレビューモード ===")
        out_path = save_preview(args.image, args.rows, args.cols, args.gap_x, args.gap_y, args.margin)
        print(f"\nデスクトップの「{out_path}」を開いて赤枠がズレていないか確認してください。")
        print("ズレている場合は --gap_x や --gap_y の値を調整してください。")
        return

    print(f"\n=== LINE スタンプ作成開始 ===")
    stickers = split_sticker_sheet(
        args.image, args.rows, args.cols, args.out, args.gap_x, args.gap_y, args.margin
    )

    make_main_image(str(stickers[0]), args.out)
    make_tab_image(str(stickers[0]), args.out)

    print(f"\n完了! {len(stickers)} 枚のスタンプを {args.out}/ に保存しました")
    print("\n--- LINE Creators Market 提出チェックリスト ---")
    print("  [x] スタンプ画像: 370×320px, PNG, 透明背景")
    print("  [x] メイン画像: 240×240px (main.png)")
    print("  [x] タブ画像: 96×74px (tab.png)")
    print("  [ ] LINE Creators Market にアカウント登録")
    print("  [ ] https://creator.line.me/ja/ でスタンプセット登録")
    print("  [ ] スタンプ説明文・タグを入力して申請")


if __name__ == "__main__":
    main()
