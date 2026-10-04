#!/usr/bin/env python3
"""Generate and verify new story/game narration without replacing older voices.

Generation never edits voice-map.js. Use --merge --asr-report REPORT after
reviewing the separately produced offline speech-recognition report.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import math
import re
import shutil
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

import edge_tts
import numpy as np

ROOT = Path(__file__).resolve().parent
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
PITCH = "+0Hz"
EXPECTED_BOOKS = 30
EXPECTED_PAGES = 180
BATCHES = {
    "stories": ("books-new-adventures.js", "voice-adventures-v1"),
    "games": ("kids-new-games.js", "voice-new-games-v1"),
}


def now() -> str:
    return datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atomic_json(path: Path, value: dict) -> None:
    tmp = path.with_name(path.name + ".part")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def load_js(name: str, expression: str):
    path = ROOT / name
    if not path.is_file() or path.stat().st_size < 30:
        raise ValueError(f"{name} 数据尚未完成，拒绝运行")
    program = (
        "const fs=require('fs'),vm=require('vm');"
        "const sandbox={window:{},console,document:{addEventListener(){}},"
        "navigator:{},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}};"
        "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),sandbox,{timeout:3000});"
        "process.stdout.write(JSON.stringify(" + expression + "));"
    )
    result = subprocess.run(["node", "-e", program, str(path)], check=True, capture_output=True, text=True)
    if not result.stdout.strip():
        raise ValueError(f"{name} 未暴露预期数据")
    return json.loads(result.stdout)


def load_items(kind: str) -> tuple[list[dict], dict]:
    filename, outname = BATCHES[kind]
    source = ROOT / filename
    items = []
    if kind == "stories":
        books = load_js(filename, "sandbox.window.BOOKS_ADVENTURES")
        if not isinstance(books, list) or len(books) != EXPECTED_BOOKS:
            raise ValueError("新增故事应为 30 本完整数据，不能发布初稿/空数组")
        ids = [book.get("id") for book in books]
        if any(not x for x in ids) or len(set(ids)) != EXPECTED_BOOKS:
            raise ValueError("新增故事 ID 缺失或重复")
        for book in books:
            if len(book.get("pages", [])) != 6:
                raise ValueError(f"{book['id']} 应为六页")
            for index, page in enumerate(book["pages"], 1):
                text = page.get("text", "")
                if not isinstance(text, str) or not text.strip():
                    raise ValueError(f"{book['id']} 第 {index} 页正文为空")
                items.append({"text": text, "spoken": text, "book_id": book["id"], "page": index})
        if len(items) != EXPECTED_PAGES or len({x["text"] for x in items}) != EXPECTED_PAGES:
            raise ValueError("180 页故事正文需要非空且互不重复")
    else:
        texts = load_js(filename, "sandbox.window.NEW_GAMES.texts")
        if not isinstance(texts, list) or len(texts) < 10:
            raise ValueError("NEW_GAMES.texts 尚不完整（至少十条完整朗读文本）")
        for text in texts:
            if not isinstance(text, str) or not text.strip():
                raise ValueError("NEW_GAMES.texts 包含空文本或非字符串")
            # The key stays identical to the runtime string; only silent emoji
            # decorations are removed from the utterance sent to the service.
            spoken = re.sub(r"[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]", "", text)
            spoken = re.sub(r"\s+", " ", spoken).strip()
            if not spoken:
                raise ValueError("游戏朗读正文不能只有表情符号")
            if not any(x["text"] == text for x in items):
                items.append({"text": text, "spoken": spoken})
    for item in items:
        digest = hashlib.sha256(item["text"].encode("utf-8")).hexdigest()
        item["text_sha256"] = digest
        item["file"] = f"{outname}/{digest[:20]}.mp3"
    config = {
        "source": filename,
        "source_sha256": sha256(source),
        "voice": VOICE,
        "rate": RATE,
        "pitch": PITCH,
    }
    return items, config


def inspect_audio(path: Path, text: str) -> dict:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    info = json.loads(probe.stdout)
    streams = [x for x in info.get("streams", []) if x.get("codec_type") == "audio"]
    if len(streams) != 1:
        raise ValueError("需要恰好一个音频流")
    stream = streams[0]
    if stream.get("codec_name") != "mp3" or int(stream["sample_rate"]) != 24000 or stream["channels"] != 1:
        raise ValueError("音频格式应为 24 kHz 单声道 MP3")
    # Decode the complete file, not just the metadata; malformed/truncated frames
    # fail before a manifest or a VOICE_MAP entry can be written.
    decoded = subprocess.run(
        ["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "f32le", "-acodec", "pcm_f32le", "-"],
        check=True, capture_output=True,
    )
    samples = np.frombuffer(decoded.stdout, dtype="<f4")
    if samples.size == 0 or not np.all(np.isfinite(samples)):
        raise ValueError("解码为空或出现非有限数值")
    duration = samples.size / 24000
    spoken_units = len(re.sub(r"[\s\W_]+", "", text))
    if duration < max(0.35, spoken_units / 14) or duration > max(20, spoken_units * 1.3):
        raise ValueError(f"音频时长异常：{duration:.3f} 秒/{spoken_units} 字符")
    absolute = np.abs(samples)
    peak = float(absolute.max())
    rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
    if rms < 0.0001:
        raise ValueError("音频几乎全为静音")
    active = np.flatnonzero(absolute > 0.003)
    tail = (samples.size - 1 - int(active[-1])) / 24000 if active.size else duration
    if tail < 0.07:
        raise ValueError(f"末尾静音不足，疑似突然截断：{tail:.3f} 秒")
    clipped = int(np.count_nonzero(absolute >= 0.999))
    return {
        "duration_seconds": round(duration, 3),
        "sample_rate": 24000,
        "channels": 1,
        "peak_dbfs": round(20 * math.log10(max(peak, 1e-10)), 3),
        "rms_dbfs": round(20 * math.log10(max(rms, 1e-10)), 3),
        "trailing_silence_seconds": round(tail, 3),
        "clipped_samples": clipped,
        "fully_decoded": True,
    }


def protect_peak(path: Path, text: str) -> dict:
    qa = inspect_audio(path, text)
    if qa["peak_dbfs"] > -0.3 or qa["clipped_samples"]:
        original_peak = qa["peak_dbfs"]
        gain = min(-1.5, -1.5 - original_peak)
        temporary = path.with_name(path.stem + ".protected.part.mp3")
        try:
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-i", str(path), "-af", f"volume={gain:.4f}dB",
                 "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "48k", str(temporary)],
                check=True, capture_output=True,
            )
            revised = inspect_audio(temporary, text)
            if revised["peak_dbfs"] > -0.3 or revised["clipped_samples"]:
                raise ValueError("峰值保护后仍有削波风险")
            temporary.replace(path)
            qa = {**revised, "peak_protection_gain_db": round(gain, 4), "original_peak_dbfs": original_peak}
        finally:
            temporary.unlink(missing_ok=True)
    return qa


async def generate_one(item: dict, config: dict, cached: dict, sem: asyncio.Semaphore) -> dict:
    target = ROOT / item["file"]
    async with sem:
        if (target.exists() and cached.get("sha256") == sha256(target)
                and cached.get("spoken") == item["spoken"]
                and cached.get("text_sha256") == item["text_sha256"]):
            try:
                qa = await asyncio.to_thread(protect_peak, target, item["spoken"])
                return {**item, "sha256": sha256(target), "qa": qa, "cached": True}
            except Exception:
                pass
        for attempt in range(4):
            temporary = target.with_name(target.stem + ".part.mp3")
            temporary.unlink(missing_ok=True)
            try:
                await edge_tts.Communicate(item["spoken"], VOICE, rate=RATE, pitch=PITCH).save(str(temporary))
                if temporary.stat().st_size < 1000:
                    raise ValueError("音频服务返回空文件")
                qa = await asyncio.to_thread(protect_peak, temporary, item["spoken"])
                temporary.replace(target)
                return {**item, "sha256": sha256(target), "qa": qa, "cached": False}
            except Exception as error:
                temporary.unlink(missing_ok=True)
                if attempt == 3:
                    raise RuntimeError(f"生成失败 {item.get('book_id', 'game')} / {item.get('page', '')}: {error}") from error
                await asyncio.sleep(1.5 * (attempt + 1))
        raise AssertionError("unreachable")


async def generate(kinds: list[str], concurrency: int) -> None:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("需要 ffmpeg 与 ffprobe")
    # Validate every input before any network request or output write.
    batches = {kind: load_items(kind) for kind in kinds}
    for kind, (items, config) in batches.items():
        out = ROOT / BATCHES[kind][1]
        out.mkdir(exist_ok=True)
        manifest_path = out / "manifest.json"
        cache_path = out / "generation-cache.json"
        old = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
        cached_files = old.get("files", {}) if all(old.get(k) == config[k] for k in ["voice", "rate", "pitch"]) else {}
        progress = json.loads(cache_path.read_text()) if cache_path.exists() else {}
        if all(progress.get(k) == config[k] for k in ["voice", "rate", "pitch"]):
            cached_files = {**cached_files, **progress.get("files", {})}
        wanted_texts = {item["text"] for item in items}
        completed = {text: record for text, record in cached_files.items() if text in wanted_texts}
        sem = asyncio.Semaphore(concurrency)

        async def record_progress(item):
            record = await generate_one(item, config, cached_files.get(item["text"], {}), sem)
            completed[item["text"]] = {k: v for k, v in record.items() if k != "text"}
            # Persist each completed clip so even an interrupted or partially
            # failed batch can resume. This is never an approval manifest.
            atomic_json(cache_path, {"updated_at": now(), **config, "files": completed})
            print(f"{kind}: {len(completed)}/{len(items)} 完成", flush=True)
            return record

        results = await asyncio.gather(
            *(record_progress(item) for item in items),
            return_exceptions=True,
        )
        failures = [str(x) for x in results if isinstance(x, Exception)]
        if failures:
            raise SystemExit(f"{kind}: {len(failures)} 条失败；保留旧清单与旧映射。\n" + "\n".join(failures))
        if sha256(ROOT / config["source"]) != config["source_sha256"]:
            raise SystemExit("生成期间源数据被修改，拒绝写清单；请重新运行")
        manifest = {
            "created_at": now(), "generator": "Microsoft Edge neural TTS", **config,
            "expressive_style": None,
            "note": "默认晓晓女性神经声线，语速减慢 8%，音高保持原值；未启用教师情感样式。",
            "text_count": len(items), "objective_qa_passed": True,
            "files": {record["text"]: {k: v for k, v in record.items() if k != "text"} for record in results},
        }
        if kind == "stories":
            manifest["book_count"] = EXPECTED_BOOKS
        atomic_json(manifest_path, manifest)
        cache_path.unlink(missing_ok=True)
        print(f"{kind}: {len(items)} 条录音与全量客观检查通过；VOICE_MAP 尚未修改", flush=True)


def validate_manifest(kind: str) -> dict:
    items, config = load_items(kind)
    path = ROOT / BATCHES[kind][1] / "manifest.json"
    manifest = json.loads(path.read_text())
    if any(manifest.get(k) != value for k, value in config.items()) or not manifest.get("objective_qa_passed"):
        raise ValueError(f"{kind} 清单配置/源文件已改变或 QA 未通过")
    expected = {x["text"]: x for x in items}
    if set(manifest["files"]) != set(expected):
        raise ValueError(f"{kind} 清单与实际朗读内容不一致")
    for text, item in manifest["files"].items():
        if item["file"] != expected[text]["file"] or item["spoken"] != expected[text]["spoken"]:
            raise ValueError(f"{kind} 文本映射错位")
        audio = ROOT / item["file"]
        if sha256(audio) != item["sha256"]:
            raise ValueError(f"{kind} 音频哈希改变")
        qa = inspect_audio(audio, item["spoken"])
        if qa["clipped_samples"] or qa["peak_dbfs"] > -0.3:
            raise ValueError(f"{kind} 音频削波风险")
    return manifest


def merge(kinds: list[str], report_path: Path, backup_dir: Path) -> None:
    manifests = {kind: validate_manifest(kind) for kind in kinds}
    review = json.loads(report_path.read_text())
    if not review.get("reviewed") or not review.get("passed"):
        raise ValueError("需要已审阅且通过的离线 ASR 质检报告")
    for kind in kinds:
        digest = sha256(ROOT / BATCHES[kind][1] / "manifest.json")
        if review.get("manifest_sha256", {}).get(kind) != digest:
            raise ValueError("ASR 报告与当前清单不匹配")
        reviewed_files = {entry.get("file"): entry for entry in review.get("records", []) if entry.get("kind") == kind}
        expected_files = {entry["file"]: entry for entry in manifests[kind]["files"].values()}
        if set(reviewed_files) != set(expected_files):
            raise ValueError("ASR 报告必须覆盖全部新增录音")
        for filename, entry in expected_files.items():
            checked = reviewed_files[filename]
            if checked.get("sha256") != entry["sha256"] or not checked.get("approved"):
                raise ValueError("ASR 审阅存在未通过或音频已改变的条目")
    path = ROOT / "voice-map.js"
    content = path.read_text().strip()
    if not content.startswith("window.VOICE_MAP=") or not content.endswith(";"):
        raise ValueError("voice-map.js 格式不正确")
    mapping = json.loads(content[len("window.VOICE_MAP="):-1])
    new_entries = {}
    for manifest in manifests.values():
        for text, entry in manifest["files"].items():
            key = "zh|" + text
            value = entry["file"] + "?v=1"
            if key in mapping and mapping[key] != value:
                raise ValueError(f"与旧映射冲突，拒绝覆盖：{key}")
            new_entries[key] = value
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / "voice-map.js.before-adventures"
    if not backup.exists():
        shutil.copy2(path, backup)
    mapping.update(new_entries)
    tmp = path.with_name(path.name + ".part")
    tmp.write_text("window.VOICE_MAP=" + json.dumps(mapping, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    tmp.replace(path)
    print(f"合并 {len(new_entries)} 条新映射，旧映射保留；合计 {len(mapping)} 条", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=["stories", "games", "all"], default="all")
    parser.add_argument("--concurrency", type=int, choices=range(1, 7), default=6)
    parser.add_argument("--qa-only", action="store_true")
    parser.add_argument("--check-data", action="store_true", help="仅检查数据，不连接语音服务")
    parser.add_argument("--merge", action="store_true")
    parser.add_argument("--asr-report", type=Path)
    parser.add_argument("--backup-dir", type=Path, default=Path("/Users/guoju/edu-app-backups/20261004-new-content"))
    args = parser.parse_args()
    kinds = list(BATCHES) if args.only == "all" else [args.only]
    if args.check_data:
        for kind in kinds:
            items, config = load_items(kind)
            print(f"{kind}: {len(items)} 条完整正文；{config['source']}")
    elif args.merge:
        if not args.asr_report:
            parser.error("--merge 必须指定 --asr-report")
        merge(kinds, args.asr_report, args.backup_dir)
    elif args.qa_only:
        for kind in kinds:
            manifest = validate_manifest(kind)
            print(f"{kind}: {manifest['text_count']} 条文件与音频 QA 通过")
    else:
        asyncio.run(generate(kinds, args.concurrency))


if __name__ == "__main__":
    main()
