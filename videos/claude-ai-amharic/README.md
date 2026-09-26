# Claude AI — Amharic explainer (20s)

A 20-second vertical (1080×1920, 30 fps) explainer video in Amharic, taught by an animated robot teacher.

- `claude_ai_amharic.mp4`: the finished video
- `video.html`: the animation (SVG robot plus scenes, driven frame by frame via `render(t)`)
- `audio.py`: generates the background music and sound effects (`music.wav`)
- `render.py`: captures every frame with Playwright/Chromium and encodes with ffmpeg

Rebuild: `pip install numpy playwright imageio-ffmpeg && python3 audio.py && python3 render.py`

Scenes: greeting → what Claude is → what it can do → chat demo in Amharic → helpful/honest/safe + claude.ai.
