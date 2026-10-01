#!/usr/bin/env python3
"""为课堂生成温柔女教师神经配音，并更新 voice-map.js。"""
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
OUT = ROOT / "voice-classroom-v1"
VOICE_MAP = ROOT / "voice-map.js"
OLD_MANIFEST = ROOT / "voice-v5" / "manifest.json"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
PITCH = "+0Hz"
CONCURRENCY = 6

PINYIN = {
    "zhi": "知", "chi": "吃", "shi": "诗", "ri": "日", "zi": "资", "ci": "词", "si": "丝",
    "yi": "衣", "wu": "乌", "yu": "迂", "ye": "耶", "yue": "约", "yuan": "渊", "yin": "因", "yun": "晕", "ying": "英",
    "ai": "哀", "ei": "诶", "ui": "威", "ao": "凹", "ou": "欧", "iu": "优", "ie": "耶", "üe": "约", "er": "儿",
    "an": "安", "en": "恩", "in": "因", "un": "温", "ün": "晕", "ang": "昂", "eng": "鞥", "ing": "英", "ong": "翁",
    "b": "玻", "p": "坡", "m": "摸", "f": "佛", "d": "得", "t": "特", "n": "呢", "l": "勒",
    "g": "哥", "k": "科", "h": "喝", "j": "鸡", "q": "七", "x": "西", "z": "资", "c": "词", "s": "丝", "r": "日",
    "a": "啊", "o": "喔", "e": "鹅", "i": "衣", "u": "乌", "ü": "迂", "w": "乌", "y": "衣",
}


def load_courses() -> list[dict]:
    js = "global.window={};require('./courses.js');process.stdout.write(JSON.stringify(window.GRADE_ONE_COURSES))"
    return json.loads(subprocess.check_output(["node", "-e", js], cwd=ROOT, text=True))


def load_voice_map() -> dict[str, str]:
    src = VOICE_MAP.read_text(encoding="utf-8").strip()
    prefix = "window.VOICE_MAP="
    if not src.startswith(prefix):
        raise RuntimeError("voice-map.js 格式无法识别")
    return json.loads(src[len(prefix):].rstrip(";"))


def old_overrides() -> dict[str, str]:
    data = json.loads(OLD_MANIFEST.read_text(encoding="utf-8"))
    return {k.removeprefix("zh|"): v for k, v in data.get("spoken_overrides", {}).items() if k.startswith("zh|")}


def runtime_texts(courses: list[dict]) -> list[str]:
    texts = [
        "老师在这里。点一节喜欢的课，我们一起开始吧。",
        "果粒橙小朋友，选一节语文课，我们一起学吧。",
        "果粒橙小朋友，选一节数学课，我们一起学吧。",
        "这节课学完啦！果粒橙小朋友认真听、认真想，真棒！",
    ]
    for c in courses:
        texts.extend([
            f"果粒橙小朋友，我们今天来学{c['title']}。{c['intro']}",
            f"看一看，跟着老师一起想。{c['demo']}",
            f"轮到你啦。{c['question']}选项一，{c['choices'][0]}。选项二，{c['choices'][1]}。选项三，{c['choices'][2]}。",
        ])
        right = c["choices"][c["answer"]]
        texts.extend([
            f"答对啦！{right}就是正确答案。你听得真认真。",
            f"没关系，我们一起看看。正确答案是{right}。",
        ])
    return list(dict.fromkeys(texts))


def spoken_text(text: str, overrides: dict[str, str]) -> str:
    out = text
    # 先复用上一轮人工校正过的拼音与数学台词。
    for original, spoken in sorted(overrides.items(), key=lambda kv: len(kv[0]), reverse=True):
        if original in out:
            out = out.replace(original, spoken)
    out = (out.replace("+", "加").replace("＋", "加")
              .replace("−", "减").replace("-", "减")
              .replace("＝", "等于").replace("=", "等于")
              .replace("＞", "大于").replace(">", "大于")
              .replace("＜", "小于").replace("<", "小于")
              .replace("→", "变成").replace("—", "到"))
    for token, reading in sorted(PINYIN.items(), key=lambda kv: len(kv[0]), reverse=True):
        out = re.sub(rf"(?<![A-Za-zü]){re.escape(token)}(?![A-Za-zü])", reading, out, flags=re.I)
    out = re.sub(r"[⭐🌟✨🎒🌏🌳👀🎵📻🥁🕊️🍉🦔☀️🌻🐦🌙🚪🦅🚂🍂🌸🪷👤🐒🐸🐾🌧️🖼️😊🏁🔢⚖️🧭🖐️⭕🐊🧩➕➖🔟🎳🛝🔄🧮📏🧱👐🧊🧺🎨🏆🍎🍌🐟🐰🍪]+", "", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def file_for(text: str) -> Path:
    return OUT / f"{hashlib.sha256(text.encode()).hexdigest()[:20]}.mp3"


async def generate_one(text: str, spoken: str, sem: asyncio.Semaphore) -> tuple[str, bool, str]:
    target = file_for(text)
    if target.exists() and target.stat().st_size > 1000:
        return text, True, "cached"
    async with sem:
        for attempt in range(4):
            tmp = target.with_suffix(".part.mp3")
            try:
                tmp.unlink(missing_ok=True)
                await edge_tts.Communicate(spoken, VOICE, rate=RATE, pitch=PITCH).save(str(tmp))
                if tmp.exists() and tmp.stat().st_size > 1000:
                    tmp.replace(target)
                    return text, True, "generated"
            except Exception as exc:
                if attempt == 3:
                    return text, False, str(exc)
                await asyncio.sleep(1.2 * (attempt + 1))
        return text, False, "unknown"


async def main() -> None:
    courses = load_courses()
    texts = runtime_texts(courses)
    overrides = old_overrides()
    OUT.mkdir(exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    jobs = [generate_one(text, spoken_text(text, overrides), sem) for text in texts]
    results = []
    for i, task in enumerate(asyncio.as_completed(jobs), 1):
        results.append(await task)
        if i % 20 == 0 or i == len(jobs):
            print(f"已完成 {i}/{len(jobs)}", flush=True)
    failed = [(text, detail) for text, ok, detail in results if not ok]
    if failed:
        for text, detail in failed[:20]:
            print("失败:", text[:50], detail)
        raise SystemExit(f"有 {len(failed)} 条语音生成失败")

    mapping = load_voice_map()
    files = {}
    for text in texts:
        rel = file_for(text).relative_to(ROOT).as_posix() + "?v=1"
        mapping[f"zh|{text}"] = rel
        files[text] = {"file": rel, "spoken": spoken_text(text, overrides)}
    VOICE_MAP.write_text("window.VOICE_MAP=" + json.dumps(mapping, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    manifest = {
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "generator": "Microsoft Edge neural TTS",
        "voice": VOICE,
        "style": "warm female teacher",
        "rate": RATE,
        "pitch": PITCH,
        "course_count": len(courses),
        "runtime_text_count": len(texts),
        "files": files,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"完成：{len(texts)} 条课堂语音，VOICE_MAP 共 {len(mapping)} 条")


if __name__ == "__main__":
    asyncio.run(main())
