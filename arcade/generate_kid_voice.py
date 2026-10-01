"""Regenerate the bundled Mandarin prompts for the 20-game challenge page."""
from pathlib import Path
import json
import subprocess
import tempfile

import soundfile as sf
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'voice'
scripts = json.loads((OUT / 'scripts.json').read_text())
pipeline = KPipeline(lang_code='z', repo_id='hexgrad/Kokoro-82M-v1.1-zh')

for key, words in scripts.items():
    audio = next(pipeline(words, voice='zf_001', speed=1.08)).audio
    with tempfile.NamedTemporaryFile(suffix='.wav') as temporary:
        sf.write(temporary.name, audio, 24000)
        subprocess.run([
            'ffmpeg', '-loglevel', 'error', '-y', '-i', temporary.name,
            '-ac', '1', '-ar', '24000', '-b:a', '56k', str(OUT / f'{key}.mp3')
        ], check=True)
    print(key, flush=True)
