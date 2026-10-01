#!/usr/bin/env python3
"""为主页面小游戏生成温柔女教师配音，并更新 voice-map.js。"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "kid.js"
OUT = ROOT / "voice-game-v1"
VOICE_MAP = ROOT / "voice-map.js"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
PITCH = "+0Hz"
CONCURRENCY = 6


def source_texts() -> list[str]:
    src = SOURCE.read_text(encoding="utf-8")
    start = src.index("const gameSets={")
    end = src.index("\n};", start)
    game_block = src[start:end]
    texts = re.findall(r"help:'([^']+)'", game_block)
    texts += re.findall(r"(?:speak|finishMiniGame)\('([^']+)'", src)
    # 动态流程会使用的完整提示语。
    texts += [
        "答对啦，真棒",
        "没关系，再试一题",
        "分类正确，真棒",
        "再想一想",
        "再看清楚颜色",
        "换另一边试试",
        "再找找一样的颜色",
        "再仔细看一看",
        "没关系，再看一遍",
        "五个苹果都找到了，真棒！",
        "六朵花都采到了，真棒！",
        "星星全部收好了，太棒了！",
        "找到小猫啦，救援成功！",
        "泡泡都洗干净啦，你的小手真灵活！",
        "水果和玩具都回到自己的家啦！",
        "彩色乘客都坐上正确的车厢啦！",
        "五个影子都找到好朋友啦！",
        "萤火虫把整条星光小路都点亮啦！",
        "三轮节奏都记住啦，你是节奏小高手！",
    ]
    return list(dict.fromkeys(t.strip() for t in texts if t.strip()))


def spoken(text: str) -> str:
    text = re.sub(r"[🐛🐾🐝🚀🍎✨🚂🫧🎈🐷🥁👂🧩🧠🧺🎒💛🔦🔢📚⭐🌟🎮☝️👆👀🎨🦆]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def file_for(text: str) -> Path:
    return OUT / f"{hashlib.sha256(text.encode()).hexdigest()[:20]}.mp3"


def load_voice_map() -> dict[str, str]:
    src = VOICE_MAP.read_text(encoding="utf-8").strip()
    return json.loads(src.removeprefix("window.VOICE_MAP=").removesuffix(";"))


async def generate_one(text: str, sem: asyncio.Semaphore) -> tuple[str, bool, str]:
    target = file_for(text)
    if target.exists() and target.stat().st_size > 1000:
        return text, True, "cached"
    async with sem:
        for attempt in range(4):
            tmp = target.with_suffix(".part.mp3")
            try:
                tmp.unlink(missing_ok=True)
                await edge_tts.Communicate(spoken(text), VOICE, rate=RATE, pitch=PITCH).save(str(tmp))
                if tmp.exists() and tmp.stat().st_size > 1000:
                    tmp.replace(target)
                    return text, True, "generated"
            except Exception as exc:
                if attempt == 3:
                    return text, False, str(exc)
                await asyncio.sleep(1.2 * (attempt + 1))
        return text, False, "unknown"


async def main() -> None:
    texts = source_texts()
    OUT.mkdir(exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(generate_one(t, sem) for t in texts))
    failed = [(t, why) for t, ok, why in results if not ok]
    if failed:
        for t, why in failed:
            print("失败:", t, why)
        raise SystemExit(1)
    mapping = load_voice_map()
    files = {}
    for text in texts:
        rel = file_for(text).relative_to(ROOT).as_posix() + "?v=1"
        mapping[f"zh|{text}"] = rel
        files[text] = {"file": rel, "spoken": spoken(text)}
    VOICE_MAP.write_text("window.VOICE_MAP=" + json.dumps(mapping, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    manifest = {
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "Microsoft Edge neural TTS",
        "voice": VOICE,
        "style": "warm female teacher",
        "rate": RATE,
        "pitch": PITCH,
        "runtime_text_count": len(texts),
        "files": files,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"完成：{len(texts)} 条游戏女声，VOICE_MAP 共 {len(mapping)} 条")


if __name__ == "__main__":
    asyncio.run(main())
