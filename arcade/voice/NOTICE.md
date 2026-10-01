The Mandarin game prompts in this directory were generated locally with
[Kokoro-82M-v1.1-zh](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh),
voice `zf_001`. The model card identifies the model license as Apache-2.0.
The spoken scripts are in `scripts.json`; the generation program is
`../generate_kid_voice.py`.

The website serves these MP3 files directly and does not call an online
text-to-speech service while a child plays.

The swipe-game introductions and the `level-*` introductions were regenerated
with Microsoft `zh-CN-XiaoxiaoNeural` (warm female voice). Their scripts are
recorded in `scripts.json` and `level-scripts.json`. The distinct `level-*`
names keep the 25-game page and 50-level page from overwriting one another.
