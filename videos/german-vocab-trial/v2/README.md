# German in 20 Seconds, with Frau Lena (v2)

`german-in-20-seconds-frau-lena.mp4`: vertical 1080×1920, 30 fps, about 22 s, AAC stereo. Loudness is normalized to −14 LUFS, the usual level for social media.

**Changes from v1:** the robot is replaced by the teacher character Frau Lena, the robotic voice by a natural neural voice, and the synth music by playful ukulele music. Lena's mouth moves with the voice, and she blinks, nods, waves and points at the cards.

## Voice
- **Model:** Supertonic 3 (int8, via sherpa-onnx), female voice **F4**. The same voice speaks English and native German.
- **How F4 was chosen:** every line was rendered with voices F1–F4, three takes each. Each take was scored for intelligibility (Whisper large-v3-turbo character error rate) and naturalness (UTMOS22 predicted MOS). F4 had the clearest German. Its English lines score about 4.1–4.4 MOS and its German lines about 3.8–4.3; single-word clips score lower.
- **Weak takes fixed:** "Danke", "Hallo" and the example sentence were re-generated until the recognizer understood them perfectly. Supertonic always drops the final "-e" of a lone "Bitte", so that word is cut from a "Bitte schön" take.
- **Final check:** Whisper on the finished soundtrack, with music, hears every line correctly.

## Content
| German | English |
|---|---|
| Hallo | Hello |
| Danke | Thank you |
| Bitte | Please |
| Wasser | Water |

**Grammar tip:** the verb always comes second. *Heute **trinke** ich Wasser.* = Today, I drink water.

## Rebuild (`source/`)
1. `st3_render.py` / `st3_retake.py` / `st3_bitte.py` render the voice takes. `st3_pick.py` picks the best take of each line into `lines_final/`.
2. `build2.py lines_final` builds the voice track, ukulele music (`opts_audio_lib.py`), sound effects and lip-sync data, producing `mix2.wav` and `timeline2.json`.
3. `render2.js full` renders `scene2.html` frame by frame with Playwright and muxes the video with ffmpeg.

The model files come from the sherpa-onnx GitHub release `tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11` and are not committed. Model licence: OpenRAIL-M.
