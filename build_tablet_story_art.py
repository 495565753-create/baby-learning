#!/usr/bin/env python3
"""Export checked 3x2 story atlases into five pages and one distinct cover."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image
import numpy as np
from build_story_art import segments

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'art/tablet-stories-v1'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--records', type=Path, required=True)
    parser.add_argument('--source-backup', type=Path, required=True)
    args = parser.parse_args()
    records = json.loads(args.records.read_text())['records']
    assert len(records) == 4
    args.source_backup.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    files = []
    for record in records:
        source = Path(record['source_path'])
        shutil.copy2(source, args.source_backup / (record['id'] + '.png'))
        picture = Image.open(source).convert('RGB')
        white = np.asarray(picture).min(axis=2) >= 235
        columns = segments(white.mean(axis=0), 3)
        target = OUT / record['id']
        target.mkdir(exist_ok=True)
        for panel in range(6):
            col, row = panel % 3, panel // 3
            left, right = columns[col]
            rows = segments(white[:, left:right].mean(axis=1), 2)
            top, bottom = rows[row]
            box = [left, top, right, bottom]
            crop = picture.crop(box)
            assert min(crop.size) >= 430, (record['id'], panel, crop.size)
            name = 'cover.webp' if panel == 5 else f'page{panel + 1}.webp'
            destination = target / name
            crop.save(destination, 'WEBP', quality=87, method=6)
            assert destination.stat().st_size < 250000
            files.append({'book': record['id'], 'page': 'cover' if panel == 5 else panel + 1,
                'file': destination.relative_to(ROOT).as_posix(), 'size': list(crop.size),
                'crop_box': box, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()})
    (OUT / 'manifest.json').write_text(json.dumps({'version': 1, 'tool': 'built-in image_gen',
        'book_count': 4, 'page_count': 20, 'cover_count': 4, 'files': files,
        'qa': 'All four original atlases visually checked before deterministic panel export.'}, ensure_ascii=False, indent=2) + '\n')
    print(f'Exported {len(files)} checked story pictures')

if __name__ == '__main__':
    main()
