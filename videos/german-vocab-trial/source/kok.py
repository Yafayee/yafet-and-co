import numpy as np, onnxruntime as ort, espeakng_loader, wave, sys, os
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from phonemizer import phonemize
EspeakWrapper.set_library(espeakng_loader.get_library_path())
EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
D=os.path.dirname(os.path.abspath(__file__))+'/kokoro/'
vocab={}
for l in open(D+'tokens.txt',encoding='utf-8'):
    l=l.rstrip('\n'); 
    if not l: continue
    t,i=l.rsplit(' ',1); vocab[t if t else ' ']=int(i)
sess=ort.InferenceSession(D+'model.int8.onnx')
voices=np.fromfile(D+'voices.bin',dtype=np.float32).reshape(11,511,256)
SPK={'af':0,'af_bella':1,'af_nicole':2,'af_sarah':3,'af_sky':4,'am_adam':5,'am_michael':6,'bf_emma':7,'bf_isabella':8,'bm_george':9,'bm_lewis':10}
def ph(text,lang):
    return phonemize(text,language=lang,backend='espeak',preserve_punctuation=True,with_stress=True,njobs=1).strip()
def synth(segs,spk='am_michael',speed=1.0):
    out=[]
    for text,lang in segs:
        p=ph(text,lang)
        if lang=='en-us': p=p.replace('ɹ','ɹ')
        toks=[vocab[c] for c in p if c in vocab][:510]
        style=voices[SPK[spk],len(toks)][None,:]
        a=sess.run(None,{'tokens':np.array([[0]+toks+[0]],dtype=np.int64),'style':style,'speed':np.array([speed],dtype=np.float32)})[0].squeeze()
        out.append((p,a))
    return out
