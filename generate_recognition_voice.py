#!/usr/bin/env python3
"""Generate female narration for the fixed 240-item recognition library."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "recognition-data.js"
OUT = ROOT / "voice-recognition-v1"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
PITCH = "+0Hz"
CONCURRENCY = 6
RETRIES = 4
PEAK_GUARD_DBFS = -0.5
PEAK_TARGET_DBFS = -2.5


def load_data() -> dict:
    source = SOURCE.read_text(encoding="utf-8")
    match = re.search(
        r"root\.RECOGNITION\s*=\s*(\{.*\})\s*;\s*\}\)\(window\);",
        source,
        re.DOTALL,
    )
    if not match:
        raise ValueError("recognition-data.js 格式不正确")
    data = json.loads(match.group(1))
    categories = data.get("categories", [])
    praise = data.get("praise", [])
    if len(categories) != 20 or any(len(category.get("items", [])) != 12 for category in categories):
        raise ValueError("认知数据需要恰好 20 类，每类 12 项")
    if len(praise) != 8:
        raise ValueError("认知奖励台词需要恰好 8 条")
    return data


def source_texts(data: dict) -> list[str]:
    texts: list[str] = []
    for category in data["categories"]:
        for item in category["items"]:
            word = item["word"].strip()
            texts.extend((item["text"].strip(), f"请找出，{word}。"))
    texts.extend(item["text"].strip() for item in data["praise"])
    texts.extend(("差一点，再看一看。", "找对啦！"))
    if len(texts) != 490 or len(set(texts)) != 490 or any(not text for text in texts):
        raise ValueError("需要 240 条讲解、240 个找图问题、8 条奖励和 2 条反馈")
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


def ensure_peak_headroom(paths: set[Path]) -> int:
    adjusted = 0
    for target in sorted(paths):
        check = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-nostats", "-i", str(target),
                "-af", "volumedetect", "-f", "null", "-",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        match = re.search(r"max_volume:\s*([+-]?[0-9.]+) dB", check.stderr)
        if not match:
            raise RuntimeError(f"无法检测峰值：{target.name}")
        peak = float(match.group(1))
        if peak <= PEAK_GUARD_DBFS:
            continue
        reduction = peak - PEAK_TARGET_DBFS
        temporary = target.with_suffix(".level.mp3")
        subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(target), "-af", f"volume=-{reduction:.2f}dB",
                "-ar", "24000", "-ac", "1", "-b:a", "48k", str(temporary),
            ],
            check=True,
        )
        if not temporary.exists() or temporary.stat().st_size <= 1000:
            raise RuntimeError(f"峰值修正失败：{target.name}")
        temporary.replace(target)
        adjusted += 1
    return adjusted


async def main() -> None:
    data = load_data()
    texts = source_texts(data)
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
    adjusted_count = ensure_peak_headroom(expected)

    files = {
        text: {
            "file": target_for(text).relative_to(ROOT).as_posix(),
            "spoken": text,
        }
        for text in texts
    }
    manifest = {
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source_version": data.get("version"),
        "generator": "Microsoft Edge neural TTS",
        "voice": VOICE,
        "rate": RATE,
        "pitch": PITCH,
        "expressive_style": None,
        "note": "默认晓晓神经声线，语速减慢 8%；未启用教师或其他情感样式。",
        "category_count": len(data["categories"]),
        "item_count": sum(len(category["items"]) for category in data["categories"]),
        "question_count": sum(len(category["items"]) for category in data["categories"]),
        "praise_count": len(data["praise"]),
        "feedback_count": 2,
        "text_count": len(texts),
        "peak_guard": {
            "threshold_dbfs": PEAK_GUARD_DBFS,
            "target_dbfs": PEAK_TARGET_DBFS,
            "adjusted_file_count": adjusted_count,
        },
        "files": files,
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"完成：{manifest['item_count']} 条讲解、{manifest['question_count']} 个问题、"
        f"{manifest['praise_count']} 条奖励和 {manifest['feedback_count']} 条反馈，共 {len(texts)} 条女声"
    )


if __name__ == "__main__":
    asyncio.run(main())
