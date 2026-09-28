import sherpa_onnx, soundfile as sf, os
B=os.path.dirname(os.path.abspath(__file__)); d=f"{B}/tts/models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
O=f"{B}/st3_bitte"; os.makedirs(O,exist_ok=True)
tts=sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
 duration_predictor=f"{d}/duration_predictor.int8.onnx",text_encoder=f"{d}/text_encoder.int8.onnx",vector_estimator=f"{d}/vector_estimator.int8.onnx",
 vocoder=f"{d}/vocoder.int8.onnx",tts_json=f"{d}/tts.json",unicode_indexer=f"{d}/unicode_indexer.bin",voice_style=f"{d}/voice.bin"),num_threads=4,provider="cpu")))
f=open(f"{O}.tsv","w"); n=0
for text in ["Bitte, bitte!","Bitte sehr!","Bitte schön!"]:
  for k in range(4):
    gc=sherpa_onnx.GenerationConfig(); gc.sid=3; gc.num_steps=24; gc.speed=0.9; gc.extra["lang"]="de"
    a=tts.generate(text,gc); p=f"{O}/b_{n}.wav"; n+=1; sf.write(p,a.samples,a.sample_rate,subtype="PCM_16"); f.write(f"{p}\tde\t{text}\n")
