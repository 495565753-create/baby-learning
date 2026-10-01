"""Generate bundled, child-friendly Mandarin speech for the 50-level games."""
from pathlib import Path
import json
import subprocess
import tempfile

import soundfile as sf
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parent
SCRIPTS = {
    'traffic-intro': '点一辆车，再点方向箭头。把挡路的车挪开，让红色小车开到右边出口。',
    'boxes-intro': '把箱子推到星星上。先看好路再推，走错了可以点弯箭头退回来。',
    'maze-intro': '用方向箭头找路。先收集所有星星，再走进小房子。',
    'pipes-intro': '轻点水管，它就会转身。把水龙头和小花连起来。',
    'slide-intro': '点空格旁边的图片，把图案拼完整。上面的小图可以帮你看答案。',
    'levels-win': '太棒啦！这一关闯过去了。点箭头，去下一关！',
    'levels-next': '新的一关开始啦。慢慢看，想好了再动手。',
    'levels-final': '五十关全部完成啦！你真会动脑筋！',
    'levels-think': '这里走不通，换个方向试试。',
}

OUT = ROOT / 'voice'
OUT.mkdir(exist_ok=True)
pipeline = KPipeline(lang_code='z', repo_id='hexgrad/Kokoro-82M-v1.1-zh')
for key, words in SCRIPTS.items():
    audio = next(pipeline(words, voice='zf_001', speed=1.08)).audio
    with tempfile.NamedTemporaryFile(suffix='.wav') as temporary:
        sf.write(temporary.name, audio, 24000)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', temporary.name,
                        '-ac', '1', '-ar', '24000', '-b:a', '56k', str(OUT / f'{key}.mp3')], check=True)
    print(key, flush=True)
(OUT / 'level-scripts.json').write_text(json.dumps(SCRIPTS, ensure_ascii=False, indent=2) + '\n')
