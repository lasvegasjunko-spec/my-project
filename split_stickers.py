#!/usr/bin/env python3
"""
LINE スタンプ作成スクリプト
スタンプシート画像を個別PNG(370×320px)に分割します。

使い方:
    python3 split_stickers.py <画像ファイル> [--rows 行数] [--cols 列数]

例:
    python3 split_stickers.py sticker_sheet.jpg
    python3 split_stickers.py sticker_sheet.jpg --rows 4 --cols 6
"""

import argparse
import os
from pathlib import Path

from PIL import Image

# LINE スタンプ規格（静止画）
LINE_WIDTH = 370
LINE_HEIGHT = 320


def split_sticker_sheet(image_path: str, rows: int, cols: int, output_dir: str) -> list[Path]:
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    print(f"入力画像サイズ: {w}x{h}px  /  グリッド: {rows}行 × {cols}列")

    cell_w = w // cols
    cell_h = h // rows

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    paths = []
    n = 1
    for row in range(rows):
        for col in range(cols):
            left = col * cell_w
            top = row * cell_h
            right = left + cell_w
            bottom = top + cell_h

            cell = img.crop((left, top, right, bottom))

            # 白い余白を透明に変換
            cell = remove_white_background(cell)

            # LINE規格にリサイズ（比率を保ちながら内側に収める）
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


def remove_white_background(img: Image.Image, threshold: int = 240) -> Image.Image:
    """白背景を透明に変換する（シンプル版）"""
    import numpy as np
    img = img.convert("RGBA")
    arr = np.array(img)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    white_mask = (r >= threshold) & (g >= threshold) & (b >= threshold)
    arr[white_mask, 3] = 0
    return Image.fromarray(arr, "RGBA")


def make_main_image(sticker_path: str, output_dir: str) -> Path:
    """LINE 規格のメイン画像（240×240）を作成"""
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
    """LINE 規格のタブ画像（96×74）を作成"""
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
    parser.add_argument("--out", default="line_stickers", help="出力フォルダ (デフォルト: line_stickers)")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"エラー: ファイルが見つかりません: {args.image}")
        return

    print(f"\n=== LINE スタンプ作成開始 ===")
    stickers = split_sticker_sheet(args.image, args.rows, args.cols, args.out)

    # 1枚目をメイン・タブ画像に使用
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
