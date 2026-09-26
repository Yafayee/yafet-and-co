# German in 20 Seconds — trial video

`german-in-20-seconds.mp4`: vertical 1080×1920, 30 fps, about 23 s, with AAC stereo audio.

Host: **ROBO**, an animated robot. Its LED mouth moves with the voice.

| German | English |
|---|---|
| Hallo | Hello |
| Danke | Thank you |
| Bitte | Please |
| Wasser | Water |

**Grammar rule:** the verb always comes second (V2).
*Heute **trinke** ich Wasser.* = Today, I drink water.

## How it's made (`source/`)
- `kok.py` / `build_audio.py`: the neural voice (Kokoro v0.19, `am_michael`). German lines are phonemized with espeak-ng in German, so they get German pronunciation. A light ring-mod and comb filter gives the voice its robot tone.
- `mix.py`: the music bed (synth pads, bass, arpeggio, drums) and sound effects are generated in code. The music ducks under the voice.
- `scene.html`: the whole animation. `renderAt(t)` draws any frame for time `t`.
- `render.js`: Playwright captures each frame and ffmpeg encodes them with the audio mix.

The Kokoro model (~130 MB) is not committed. It comes from the npm package `n8n-nodes-ttsbro` (`kokoro-int8-en-v0_19/`).
