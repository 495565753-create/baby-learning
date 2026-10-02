#!/usr/bin/env python3
"""Slice the original story atlases into lightweight individual WebP pages."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parent
FOLDER=ROOT/'art/story-refresh-v1'

def books():
    original=json.loads((ROOT/'books.js').read_text().split('=',1)[1].strip().rstrip(';'))
    source=(ROOT/'books-extra.js').read_text()
    extra=json.loads(source.split('=',1)[1].strip().rstrip(';'))
    return original+extra

def records(folder):
    out={}
    for path in sorted(folder.glob('generated*.json')):
        data=json.loads(path.read_text())
        entries=data.get('items',data.get('books',{}))
        if isinstance(entries,list): entries={entry['id']:entry for entry in entries}
        for key,value in entries.items():
            if not value.get('generated'): continue
            if value.get('ok') is False: continue
            if value.get('qa',{}).get('status') not in [None,'pass']: continue
            out[key]=value
    return out

def segments(scores,count):
    """Remove narrow atlas divider lines; generated panel heights may vary."""
    size=len(scores);step=size/count;dividers=[(0,0)]
    for index in range(1,count):
        expected=index*step
        start=max(1,round(expected-step*.16))
        stop=min(size-1,round(expected+step*.16))
        indices=np.flatnonzero(scores[start:stop]>=.88)+start
        groups=np.split(indices,np.where(np.diff(indices)>1)[0]+1) if len(indices) else []
        groups=[g for g in groups if 0<len(g)<=12]
        if groups:
            best=min(groups,key=lambda g:abs(float(g.mean())-expected))
            dividers.append((int(best[0]),int(best[-1])+1))
        else:
            point=round(expected);dividers.append((point,point))
    dividers.append((size,size))
    return [(dividers[i][1],dividers[i+1][0]) for i in range(count)]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--records-dir',type=Path,default=FOLDER,help='Local source metadata folder; originals can be kept outside the deployable site.')
    args=parser.parse_args()
    source=records(args.records_dir); allbooks=books(); ready={}; details=[]
    for book in allbooks:
        record=source.get(book['id'])
        if not record: continue
        generated=record['generated']
        path=generated.get('source_path') or generated.get('workspace_path')
        if not path:
            match=re.search(r'(/[^\n`]+\.png)',generated.get('output_hint',''))
            if not match: raise ValueError(book['id'])
            path=match.group(1).split(' as ')[-1]
        im=Image.open(path).convert('RGB')
        cols=record.get('cols',2); rows=record.get('rows',math.ceil(len(book['pages'])/2))
        left=record.get('offsetCol',0); top=record.get('offsetRow',0)
        white=np.asarray(im).min(axis=2)>=235
        columns=segments(white.mean(axis=0),cols)
        # Books in a paired atlas can have slightly different row boundaries.
        span=1 if record.get('single') else 2
        book_left=columns[left][0];book_right=columns[min(cols-1,left+span-1)][1]
        row_segments=segments(white[:,book_left:book_right].mean(axis=1),rows)
        target=FOLDER/book['id']; target.mkdir(parents=True,exist_ok=True)
        pages=[]
        for n in range(len(book['pages'])):
            col=left+(0 if record.get('single') else n%2)
            row=top+(0 if record.get('single') else n//2)
            assert col<cols and row<rows,(book['id'],n,col,row)
            box=(columns[col][0],row_segments[row][0],columns[col][1],row_segments[row][1])
            page=im.crop(box)
            destination=target/f'page{n+1}.webp'
            page.save(destination,'WEBP',quality=87,method=6)
            relative=destination.relative_to(ROOT).as_posix()
            pages.append(relative)
            details.append({'book':book['id'],'page':n+1,'file':relative,'size':list(page.size),'crop_box':list(box),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()})
        ready[book['id']]=pages
    mapping='(function(){const all=window.BOOKS||[];for(const book of window.BOOKS_EXTRA||[]){if(!all.some(existing=>existing.id===book.id))all.push(book);}window.BOOKS=all;const pictures='+json.dumps(ready,separators=(',',':'))+';for(const book of all){const pages=pictures[book.id];if(!pages||pages.length!==book.pages.length)continue;book.reillustrated=true;book.cover=pages[0];book.pages.forEach((page,index)=>{page.img=pages[index];});}})();\n'
    (ROOT/'story-art-map.js').write_text(mapping)
    (FOLDER/'manifest.json').write_text(json.dumps({'book_count':len(ready),'page_count':len(details),'original_books':82,'new_books':12,'tool':'built-in image_gen','files':details},ensure_ascii=False,indent=2)+'\n')
    missing=[b['id'] for b in allbooks if b['id'] not in ready]
    print(f'{len(ready)}/{len(allbooks)} stories; {len(details)} pages encoded')
    print('remaining:',','.join(missing))

if __name__=='__main__':main()
