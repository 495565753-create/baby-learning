#!/usr/bin/env python3
"""Encode checked image_gen story boards into individual mobile WebP pages."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from build_story_art import segments

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'art' / 'adventures-v1'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--records', required=True, type=Path)
    parser.add_argument('--allow-partial', action='store_true')
    args = parser.parse_args()
    records = json.loads(args.records.read_text())['items']
    books = json.loads((ROOT / 'books-new-adventures.js').read_text().split('=', 1)[1].strip().rstrip(';'))
    ready, files = [], []
    originals = args.records.parent / 'story-atlases'
    originals.mkdir(parents=True, exist_ok=True)
    for book in books:
        entry = records.get(book['id'])
        if not entry or entry.get('qa', {}).get('status') != 'pass':
            continue
        source = Path(entry['source_path'])
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        archived = originals / f"{book['id']}-{source_hash[:10]}.png"
        if not archived.exists():
            shutil.copy2(source, archived)
        im = Image.open(source).convert('RGB')
        assert abs(im.width / im.height - 2 / 3) < .06, (book['id'], im.size)
        white = np.asarray(im).min(axis=2) >= 235
        columns = segments(white.mean(axis=0), 2, search_ratio=.22)
        rows = segments(white.mean(axis=1), 3, search_ratio=.22)
        folder = OUTPUT / book['id']
        folder.mkdir(parents=True, exist_ok=True)
        for index, page in enumerate(book['pages']):
            col, row = index % 2, index // 2
            box = (columns[col][0], rows[row][0], columns[col][1], rows[row][1])
            picture = im.crop(box)
            # Small variations in generated row heights are preserved rather than stretched.
            assert picture.width >= 430 and picture.height >= 430, (book['id'], index, box)
            target = folder / f'page{index + 1}.webp'
            assert page['img'] == target.relative_to(ROOT).as_posix()
            picture.save(target, 'WEBP', quality=87, method=6)
            files.append({'book': book['id'], 'page': index + 1, 'file': page['img'],
                          'size': list(picture.size), 'crop_box': list(box),
                          'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                          'source_sha256': source_hash})
        ready.append(book['id'])
    if not args.allow_partial:
        assert len(ready) == 30 and len(files) == 180, (len(ready), len(files))
    manifest = {'book_count': len(ready), 'page_count': len(files),
                'generator': 'built-in image_gen', 'files': files}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'checked_books_encoded': len(ready), 'pages': len(files)}))


if __name__ == '__main__':
    main()
