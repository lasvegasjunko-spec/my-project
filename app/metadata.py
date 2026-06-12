"""タイトル・説明・タグの自動生成。ANTHROPIC_API_KEY があれば Claude API、無ければテンプレート。"""
import json
import os

PROMPT = """あなたはYouTube SEOの専門家です。睡眠・リラックス系BGMチャンネルの動画メタデータを作成します。

曲の情報:
- 曲名/テーマ: {theme}
- ジャンル: {genre}
- 動画の長さ: {minutes}分

以下を生成してください:
1. 日本語タイトルと英語タイトル(検索されやすいキーワードを含む、60文字以内)
2. 説明文(日英併記、最初の2行に重要キーワード、タイムスタンプ不要、チャンネル登録の呼びかけを含む)
3. タグ(日英混合で15個、カンマ区切り)
"""

SCHEMA = {
    "type": "object",
    "properties": {
        "title_ja": {"type": "string"},
        "title_en": {"type": "string"},
        "description": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["title_ja", "title_en", "description", "tags"],
    "additionalProperties": False,
}


def generate(theme: str, genre: str, minutes: int) -> dict:
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            return _generate_with_claude(theme, genre, minutes)
        except Exception as e:
            fallback = _generate_template(theme, genre, minutes)
            fallback["note"] = f"Claude API失敗のためテンプレート使用: {e}"
            return fallback
    result = _generate_template(theme, genre, minutes)
    result["note"] = "ANTHROPIC_API_KEY 未設定のためテンプレート生成"
    return result


def _generate_with_claude(theme: str, genre: str, minutes: int) -> dict:
    import anthropic

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{
            "role": "user",
            "content": PROMPT.format(theme=theme, genre=genre, minutes=minutes),
        }],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def _generate_template(theme: str, genre: str, minutes: int) -> dict:
    hours = minutes / 60
    length = f"{hours:.0f}時間" if minutes >= 60 else f"{minutes}分"
    return {
        "title_ja": f"【{length}】{theme} | {genre} 睡眠用BGM・リラックス音楽",
        "title_en": f"{theme} - {genre} Sleep Music & Relaxing BGM ({length})",
        "description": (
            f"{theme}の{genre}BGMです。睡眠・リラックス・作業用にどうぞ。\n"
            f"{theme} - {genre} music for sleep, relaxation and focus.\n\n"
            "🔔 チャンネル登録お願いします / Please subscribe!\n"
        ),
        "tags": [
            theme, genre, "睡眠用BGM", "リラックス", "作業用BGM", "癒し",
            "sleep music", "relaxing music", "BGM", "ambient",
            "寝かしつけ", "安眠", "deep sleep", "calm music", "study music",
        ],
    }
