"""Render the video script with Supertonic 3 female voices (several takes), for scoring."""
import sherpa_onnx, soundfile as sf, os, sys, time
B = os.path.dirname(os.path.abspath(__file__))
d = f"{B}/tts/models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
OUT = f"{B}/st3_takes"
SCRIPT = [
 ('intro', 'en', "Hi! I'm Lena. Let's learn four German words in twenty seconds!"),
 ('w1a', 'de', 'Hallo!'), ('w1b', 'en', 'Hello.'),
 ('w2a', 'de', 'Danke!'), ('w2b', 'en', 'Thank you.'),
 ('w3a', 'de', 'Bitte!'), ('w3b', 'en', 'Please.'),
 ('w4a', 'de', 'Wasser!'), ('w4b', 'en', 'Water.'),
 ('rule', 'en', 'Grammar tip: in German, the verb always comes second.'),
 ('exa', 'de', 'Heute trinke ich Wasser.'),
 ('exb', 'en', 'Today, I drink water.'),
 ('outro', 'en', 'Follow for more!'),
 ('tsch', 'de', 'Tschüss!'),
]
voices = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else [0, 1, 2, 3]
takes = int(sys.argv[2]) if len(sys.argv) > 2 else 3
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
        duration_predictor=f"{d}/duration_predictor.int8.onnx", text_encoder=f"{d}/text_encoder.int8.onnx",
        vector_estimator=f"{d}/vector_estimator.int8.onnx", vocoder=f"{d}/vocoder.int8.onnx",
        tts_json=f"{d}/tts.json", unicode_indexer=f"{d}/unicode_indexer.bin", voice_style=f"{d}/voice.bin"),
    num_threads=4, provider="cpu")))
tsv = open(f"{OUT}.tsv", 'a')
t0 = time.time()
for sid in voices:
    for lid, lang, text in SCRIPT:
        for k in range(takes):
            gc = sherpa_onnx.GenerationConfig()
            gc.sid = sid; gc.num_steps = 20
            gc.speed = 0.92 if (lang == 'de' and len(text) < 12) else 1.0
            gc.extra["lang"] = lang
            a = tts.generate(text, gc)
            p = f"{OUT}/F{sid+1}/{lid}_{k}.wav"; os.makedirs(os.path.dirname(p), exist_ok=True)
            sf.write(p, a.samples, a.sample_rate, subtype='PCM_16')
            tsv.write(f"{p}\t{lang}\t{text}\n"); tsv.flush()
    print('voice', sid, 'done', round(time.time() - t0, 1), 's', flush=True)
