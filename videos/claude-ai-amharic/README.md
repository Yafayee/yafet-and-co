# Claude AI: Amharic explainer with a robot teacher

A vertical (1080×1920, 30 fps) explainer video in Amharic, taught by an animated robot teacher.

- `claude_ai_amharic_voice.mp4`: **narrated version** (~27s). The robot speaks Amharic (espeak-ng) and captions highlight word by word.
- `claude_ai_amharic.mp4`: original 20s version with captions and music only (no voice)
- `voice.py`: generates the Amharic narration (`vo/*.wav`) and `timeline.json` (scene timings follow the speech)
- `video.html`: the animation (SVG robot plus scenes), driven frame by frame via `render(t)`; reads `timeline.js`
- `audio.py`: generates the music and sound effects, and mixes in the narration with ducking (`mix.wav`)
- `render.py`: captures every frame with Playwright/Chromium and encodes with ffmpeg

Rebuild:
```
apt-get install espeak-ng && pip install numpy playwright imageio-ffmpeg
python3 voice.py
python3 -c "import json;print('window.TL = '+json.dumps(json.load(open('timeline.json')))+';')" > timeline.js
python3 audio.py && python3 render.py
```
To use a human voice instead, replace `vo/line0-4.wav` with recordings and update the `dur` values in `timeline.json`.
