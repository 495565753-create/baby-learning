#!/usr/bin/env python3
"""Generate the eight navigation prompts without changing the runtime voice map."""

from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "voice-navigation-v1"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
PITCH = "+0Hz"

TEXTS = [
    "手指动一动。滑一滑，拖一拖，选一个喜欢的游戏吧。",
    "点一点。轻轻点屏幕，小手也能玩游戏。",
    "找一找。看看图片，找到一样的朋友。",
    "想一想。慢慢想，试试看，答错也没有关系。",
    "自由玩。画画，涂色，弹小琴，选一个喜欢的吧。",
    "先选一种颜色，再点图画里的小块，就能涂上颜色啦。",
    "先选一种颜色，再用小手在白纸上画画。也可以点图章，印上小星星。",
    "轻轻点彩色琴键，听听不同的声音。点播放按钮，还能听小星星。",
]


def target_for(text: str) -> Path:
    name = hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]
    return OUT / f"{name}.mp3"


async def generate_one(text: str) -> None:
    target = target_for(text)
    if target.exists() and target.stat().st_size > 1000:
        return
    temporary = target.with_suffix(".part.mp3")
    temporary.unlink(missing_ok=True)
    await edge_tts.Communicate(
        text,
        VOICE,
        rate=RATE,
        pitch=PITCH,
    ).save(str(temporary))
    if not temporary.exists() or temporary.stat().st_size <= 1000:
        raise RuntimeError(f"语音生成失败：{text}")
    temporary.replace(target)


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    await asyncio.gather(*(generate_one(text) for text in TEXTS))

    files = {
        text: {
            "file": target_for(text).relative_to(ROOT).as_posix(),
            "spoken": text,
        }
        for text in TEXTS
    }
    manifest = {
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "Microsoft Edge neural TTS",
        "voice": VOICE,
        "rate": RATE,
        "pitch": PITCH,
        "expressive_style": None,
        "note": "默认晓晓神经声线，语速减慢 8%；未启用教师或其他情感样式。",
        "text_count": len(TEXTS),
        "files": files,
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"完成：{len(TEXTS)} 条导航语音")


if __name__ == "__main__":
    asyncio.run(main())
