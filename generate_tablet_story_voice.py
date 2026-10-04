#!/usr/bin/env python3
"""Generate complete new tablet story narration; map only reviewed recordings."""
import argparse
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'voice-tablet-stories-v1'
SOURCE = 'books-tablet-stories.js'
SPEC = importlib.util.spec_from_file_location('tablet_voice_quality', ROOT / 'generate_adventure_voice.py')
QA = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QA)


def items():
    books = QA.load_js(SOURCE, 'sandbox.window.BOOKS_TABLET_STORIES')
    if len(books) != 4 or len({b['id'] for b in books}) != 4:
        raise ValueError('Four complete and distinct tablet stories are required')
    rows = []
    for book in books:
        if len(book['pages']) != 5:
            raise ValueError('Each tablet story must have five pages')
        for n, page in enumerate(book['pages'], 1):
            text = page['text']
            if not isinstance(text, str) or not text.strip():
                raise ValueError('Empty story page')
            digest = hashlib.sha256(text.encode()).hexdigest()
            rows.append({'text': text, 'spoken': text, 'text_sha256': digest,
                         'file': f'voice-tablet-stories-v1/{digest[:20]}.mp3',
                         'book_id': book['id'], 'page': n})
    if len({row['text'] for row in rows}) != 20:
        raise ValueError('All story page texts must be distinct')
    return rows


async def generate():
    wanted = items()
    source_hash = QA.sha256(ROOT / SOURCE)
    OUT.mkdir(exist_ok=True)
    cache_file = OUT / 'generation-cache.json'
    cache_source = cache_file if cache_file.exists() else OUT / 'manifest.json'
    cache = json.loads(cache_source.read_text()).get('files', {}) if cache_source.exists() else {}
    config = {'voice': QA.VOICE, 'rate': QA.RATE, 'pitch': QA.PITCH}
    completed = {}
    sem = asyncio.Semaphore(3)

    async def one(item):
        row = await QA.generate_one(item, config, cache.get(item['text'], {}), sem)
        completed[item['text']] = {key: value for key, value in row.items() if key != 'text'}
        QA.atomic_json(cache_file, {**config, 'files': completed})
        print(f'Tablet story voice checked {len(completed)}/20', flush=True)
        return row

    rows = await asyncio.gather(*(one(item) for item in wanted), return_exceptions=True)
    failed = [str(row) for row in rows if isinstance(row, Exception)]
    if failed:
        raise SystemExit('\n'.join(failed))
    if QA.sha256(ROOT / SOURCE) != source_hash:
        raise SystemExit('Story source changed during generation; rerun before installing')
    QA.atomic_json(OUT / 'manifest.json', {'created_at': QA.now(),
        'generator': 'Microsoft Edge neural TTS', **config, 'source': SOURCE,
        'source_sha256': source_hash, 'book_count': 4, 'text_count': 20,
        'objective_qa_passed': True, 'files': completed})
    print('All clips fully decoded; mapping awaits reviewed transcription', flush=True)


def install(report_path):
    manifest = json.loads((OUT / 'manifest.json').read_text())
    report = json.loads(Path(report_path).read_text())
    approved = {row['expected']: row for row in report.get('records', [])}
    expected = {row['text']: row for row in items()}
    if (not report.get('approved') or manifest['source_sha256'] != QA.sha256(ROOT / SOURCE)
            or set(approved) != set(expected) or set(manifest['files']) != set(expected)):
        raise SystemExit('A complete current-source transcription approval is required')
    mapping = {}
    for text, row in manifest['files'].items():
        digest = QA.sha256(ROOT / row['file'])
        if (not approved[text].get('approved') or digest != row['sha256']
                or digest != approved[text].get('sha256')):
            raise SystemExit('Unreviewed story recording: ' + text)
        quality = QA.inspect_audio(ROOT / row['file'], text)
        if not quality['fully_decoded'] or quality['clipped_samples']:
            raise SystemExit('Recording failed full decoding')
        mapping['zh|' + text] = row['file'] + '?v=1'
    manifest.update({'asr_content_check_passed': True, 'asr_reviewed_clips': len(approved),
        'qa_limitation': 'Reviewed transcription and decoding do not establish subjective naturalness or human listening.'})
    QA.atomic_json(OUT / 'manifest.json', manifest)
    (ROOT / 'tablet-story-voice-map.js').write_text('/* Checked female narration for new tablet stories. */\n(function(root){root.VOICE_MAP=Object.assign(root.VOICE_MAP||{},' + json.dumps(mapping, ensure_ascii=False, indent=2) + ');})(window);\n')
    print('Installed 20 reviewed female story clips')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--install-map', action='store_true')
    parser.add_argument('--asr-report')
    args = parser.parse_args()
    if args.install_map:
        if not args.asr_report:
            parser.error('--asr-report required')
        install(args.asr_report)
    else:
        asyncio.run(generate())
