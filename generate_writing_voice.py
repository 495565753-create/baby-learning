#!/usr/bin/env python3
"""Generate writing-teacher clips; install only after full audio and ASR review."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'voice-writing-v1'
HOME_INTRO = '首页有学写字、故事、认一认、小游戏、老师课堂、画画音乐，还有小影院。点一张喜欢的卡片吧。'
SPEC = importlib.util.spec_from_file_location('voice_quality', ROOT / 'generate_adventure_voice.py')
QA = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QA)


def texts():
    program = """const fs=require('fs'),vm=require('vm');
const box={window:{},console};vm.createContext(box);
for(const name of ['kids-writing-data.js','kids-writing.js'])
  vm.runInContext(fs.readFileSync(name,'utf8'),box);
if(box.window.WRITING_LESSONS.length!==10)throw Error('Writing lessons incomplete');
process.stdout.write(JSON.stringify(box.window.WRITING.texts));"""
    values = json.loads(subprocess.check_output(['node', '-e', program], cwd=ROOT, text=True))
    return list(dict.fromkeys(values + [HOME_INTRO]))


async def generate():
    wanted = texts()
    OUT.mkdir(exist_ok=True)
    path = OUT / 'generation-cache.json'
    cache_source = path if path.exists() else OUT / 'manifest.json'
    old = json.loads(cache_source.read_text()) if cache_source.exists() else {}
    cache = old.get('files', {})
    completed = {}
    semaphore = asyncio.Semaphore(3)
    config = {'voice': QA.VOICE, 'rate': QA.RATE, 'pitch': QA.PITCH}

    async def one(text):
        digest = hashlib.sha256(text.encode()).hexdigest()
        item = {'text': text, 'spoken': text, 'text_sha256': digest,
                'file': f'voice-writing-v1/{digest[:20]}.mp3'}
        row = await QA.generate_one(item, config, cache.get(text, {}), semaphore)
        completed[text] = {key: value for key, value in row.items() if key != 'text'}
        QA.atomic_json(path, {**config, 'files': completed})
        print(f'Writing voice checked {len(completed)}/{len(wanted)}', flush=True)
        return row

    results = await asyncio.gather(*(one(text) for text in wanted), return_exceptions=True)
    failures = [str(row) for row in results if isinstance(row, Exception)]
    if failures:
        raise SystemExit('\n'.join(failures))
    if texts() != wanted:
        raise SystemExit('Writing text changed during generation; rerun before installation')
    manifest = {'created_at': QA.now(), 'generator': 'Microsoft Edge neural TTS', **config,
                'lesson_count': 10, 'text_count': len(wanted), 'objective_qa_passed': True,
                'source_files': {name: QA.sha256(ROOT / name) for name in ['kids-writing-data.js', 'kids-writing.js']},
                'files': {text: completed[text] for text in wanted}}
    QA.atomic_json(OUT / 'manifest.json', manifest)
    print('Full decoding completed; voice map awaits reviewed offline transcription', flush=True)


def install(report_path):
    manifest = json.loads((OUT / 'manifest.json').read_text())
    report = json.loads(Path(report_path).read_text())
    rows = report.get('records', [])
    if not report.get('approved') or len(rows) != manifest['text_count']:
        raise SystemExit('A complete approved transcription report is required')
    reviewed = {row['expected']: row for row in rows}
    if set(manifest['files']) != set(texts()) or set(reviewed) != set(texts()):
        raise SystemExit('Voice texts and reviewed texts differ')
    mapping, durations = {}, {}
    for text, file in manifest['files'].items():
        digest = QA.sha256(ROOT / file['file'])
        if digest != file['sha256'] or reviewed[text].get('sha256') != digest or not reviewed[text].get('approved'):
            raise SystemExit('Unreviewed or changed recording: ' + text)
        quality = QA.inspect_audio(ROOT / file['file'], text)
        if quality['clipped_samples'] or not quality['fully_decoded']:
            raise SystemExit('Recording failed objective verification')
        mapping['zh|' + text] = file['file'] + '?v=1'
        durations[text] = quality['duration_seconds']
    content = '/* Checked female guidance for original writing lessons. */\n(function(root){\n'
    content += 'root.VOICE_MAP=Object.assign(root.VOICE_MAP||{},' + json.dumps(mapping, ensure_ascii=False, indent=2) + ');\n'
    content += 'root.WRITING_VOICE_DURATIONS=' + json.dumps(durations, ensure_ascii=False, indent=2) + ';\n})(window);\n'
    manifest['asr_content_check_passed'] = True
    manifest['asr_reviewed_clips'] = len(reviewed)
    manifest['asr_method'] = report.get('method', 'Offline transcription with reviewed spelling differences')
    manifest['qa_limitation'] = 'Decoding and reviewed automated transcription do not establish subjective naturalness or human listening.'
    QA.atomic_json(OUT / 'manifest.json', manifest)
    (ROOT / 'writing-voice-map.js').write_text(content)
    print(f'Installed {len(mapping)} checked writing clips and demonstration durations')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--install-map', action='store_true')
    parser.add_argument('--asr-report')
    args = parser.parse_args()
    if args.install_map:
        if not args.asr_report:
            parser.error('--asr-report is required for installation')
        install(args.asr_report)
    else:
        asyncio.run(generate())
