#!/usr/bin/env python3
"""Generate narration for the supplemental six-page story collection."""

from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "books-extra.js"
OUT = ROOT / "voice-extra-story-v1"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
PITCH = "+0Hz"
CONCURRENCY = 6
RETRIES = 4


def load_books() -> list[dict]:
    source = SOURCE.read_text(encoding="utf-8").strip()
    prefix = "window.BOOKS_EXTRA="
    if not source.startswith(prefix) or not source.endswith(";"):
        raise ValueError("books-extra.js 格式不正确")
    books = json.loads(source[len(prefix) : -1])
    if len(books) != 12 or any(len(book.get("pages", [])) != 6 for book in books):
        raise ValueError("需要恰好 12 本书，每本 6 页")
    return books


def source_texts(books: list[dict]) -> list[str]:
    texts = [page["text"].strip() for book in books for page in book["pages"]]
    if len(texts) != 72 or len(set(texts)) != 72 or any(not text for text in texts):
        raise ValueError("需要 72 条非空且互不重复的故事正文")
    return texts


def target_for(text: str) -> Path:
    name = hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]
    return OUT / f"{name}.mp3"


async def generate_one(text: str, semaphore: asyncio.Semaphore) -> tuple[str, str | None]:
    target = target_for(text)
    if target.exists() and target.stat().st_size > 1000:
        return text, None
    async with semaphore:
        error = "unknown"
        for attempt in range(RETRIES):
            temporary = target.with_suffix(".part.mp3")
            temporary.unlink(missing_ok=True)
            try:
                await edge_tts.Communicate(
                    text,
                    VOICE,
                    rate=RATE,
                    pitch=PITCH,
                ).save(str(temporary))
                if temporary.exists() and temporary.stat().st_size > 1000:
                    temporary.replace(target)
                    return text, None
                error = "empty output"
            except Exception as exc:  # network/service failures are retried below
                error = str(exc)
            temporary.unlink(missing_ok=True)
            await asyncio.sleep(1.2 * (attempt + 1))
        return text, error


async def main() -> None:
    books = load_books()
    texts = source_texts(books)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    manifest_path.unlink(missing_ok=True)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(generate_one(text, semaphore) for text in texts))
    failures = [(text, error) for text, error in results if error]
    if failures:
        for text, error in failures:
            print(f"失败：{text}\n  {error}")
        raise SystemExit(f"有 {len(failures)} 条失败；未写入清单")

    expected = {target_for(text) for text in texts}
    for stale in OUT.glob("*.mp3"):
        if stale not in expected:
            stale.unlink()

    files = {
        text: {
            "file": target_for(text).relative_to(ROOT).as_posix(),
            "spoken": text,
        }
        for text in texts
    }
    manifest = {
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "Microsoft Edge neural TTS",
        "voice": VOICE,
        "rate": RATE,
        "pitch": PITCH,
        "expressive_style": None,
        "note": "默认晓晓神经声线，语速减慢 8%；未启用教师或其他情感样式。",
        "book_count": len(books),
        "text_count": len(texts),
        "files": files,
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"完成：{len(books)} 本、{len(texts)} 条故事女声")


if __name__ == "__main__":
    asyncio.run(main())
