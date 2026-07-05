#!/bin/bash
# BGM動画ファクトリー ワンクリック起動スクリプト (Mac用)
# Finderでこのファイルをダブルクリックすると起動します。
cd "$(dirname "$0")"

echo "=================================="
echo " 🎵 BGM動画ファクトリー 起動中..."
echo "=================================="

# 最新版を取得（失敗しても続行）
git pull origin claude/peaceful-pascal-rfki8q 2>/dev/null || echo "（更新チェックをスキップしました）"

# Python チェック
if ! command -v python3 >/dev/null; then
  echo "❌ Python3 が見つかりません。https://www.python.org からインストールしてください。"
  read -p "Enterで閉じる"; exit 1
fi

# 仮想環境を作成/利用
if [ ! -d .venv ]; then
  echo "初回セットアップ中（1〜2分かかります）..."
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

# ffmpeg チェック
if ! command -v ffmpeg >/dev/null; then
  echo "⚠️  ffmpeg が見つかりません。動画生成にはffmpegが必要です。"
  echo "   ターミナルで: brew install ffmpeg"
fi

# 3秒後にブラウザを自動で開く
( sleep 3 && open http://localhost:8000 ) &

echo ""
echo "✅ 起動しました → http://localhost:8000"
echo "   終了するにはこのウィンドウで Ctrl+C を押すか、ウィンドウを閉じてください。"
echo ""
.venv/bin/uvicorn app.main:app --port 8000
