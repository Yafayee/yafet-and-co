"""Extra takes (voice F4) for lines whose final sounds got swallowed; variants of text/speed."""
import sherpa_onnx, soundfile as sf, os
B = os.path.dirname(os.path.abspath(__file__))
d = f"{B}/tts/models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
OUT = f"{B}/st3_retakes"; os.makedirs(OUT, exist_ok=True)
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
        duration_predictor=f"{d}/duration_predictor.int8.onnx", text_encoder=f"{d}/text_encoder.int8.onnx",
        vector_estimator=f"{d}/vector_estimator.int8.onnx", vocoder=f"{d}/vocoder.int8.onnx",
        tts_json=f"{d}/tts.json", unicode_indexer=f"{d}/unicode_indexer.bin", voice_style=f"{d}/voice.bin"),
    num_threads=4, provider="cpu")))
# (line id, expected text for scoring, [text variants to synthesize], [speeds], takes per variant)
JOBS = [
    ('w2a', 'Danke!', ['Danke!', 'Danke.', 'Danke!!'], [0.8, 0.88], 3),
    ('w3a', 'Bitte!', ['Bitte!', 'Bitte.', 'Bitte!!'], [0.8, 0.88], 3),
    ('w1a', 'Hallo!', ['Hallo!', 'Hallo.'], [0.85, 0.92], 2),
    ('exa', 'Heute trinke ich Wasser.', ['Heute trinke ich Wasser.', 'Heute trinke ich Wasser!'], [0.88, 0.95], 3),
]
tsv = open(f"{OUT}.tsv", 'w')
for lid, expect, variants, speeds, takes in JOBS:
    n = 0
    for text in variants:
        for sp in speeds:
            for k in range(takes):
                gc = sherpa_onnx.GenerationConfig(); gc.sid = 3; gc.num_steps = 24; gc.speed = sp; gc.extra["lang"] = "de"
                a = tts.generate(text, gc)
                p = f"{OUT}/{lid}_{n}.wav"; n += 1
                sf.write(p, a.samples, a.sample_rate, subtype='PCM_16')
                tsv.write(f"{p}\tde\t{expect}\n"); tsv.flush()
print('done')
