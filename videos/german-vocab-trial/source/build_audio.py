import numpy as np, json, wave
from kok import synth, vocab
SR=24000
# (id, [(text,lang)], pause_after_s)
SCRIPT=[
 ('intro',[("Hi! I'm Robo. Let's learn German, fast!",'en-us')],0.35),
 ('w1a',[("Hallo!",'de')],0.25),('w1b',[("Hello.",'en-us')],0.6),
 ('w2a',[("Danke!",'de')],0.25),('w2b',[("Thank you.",'en-us')],0.6),
 ('w3a',[("Bitte!",'de')],0.25),('w3b',[("Please.",'en-us')],0.6),
 ('w4a',[("Wasser!",'de')],0.25),('w4b',[("Water.",'en-us')],0.6),
 ('rule',[("Grammar rule: the verb always comes second.",'en-us')],0.3),
 ('exa',[("Heute trinke ich Wasser.",'de')],0.2),
 ('exb',[("Today, I drink water.",'en-us')],0.45),
 ('outro',[("Follow for more. Tschüss!",'en-us')],0.6),
]
def fix(p,lang):
    return p
lead=0.6
t=lead; parts=[np.zeros(int(lead*SR),np.float32)]; tl=[]
for sid,segs,pause in SCRIPT:
    auds=[]
    for text,lang in segs:
        if 'Tschüss' in text:  # mix: English sentence + German word
            a1=synth([("Follow for more.",'en-us')])[0][1]; a2=synth([("Tschüss!",'de')])[0][1]
            a=np.concatenate([a1,np.zeros(int(.12*SR),np.float32),a2])
        else:
            a=synth([(text,lang)],speed=0.92 if lang=='de' else 1.0)[0][1]
        # trim silence
        idx=np.where(np.abs(a)>0.01)[0]; a=a[max(idx[0]-240,0):idx[-1]+480]
        auds.append(a)
    a=np.concatenate(auds).astype(np.float32)
    tl.append({'id':sid,'start':round(t,3),'end':round(t+len(a)/SR,3)})
    parts+= [a, np.zeros(int(pause*SR),np.float32)]; t+=len(a)/SR+pause
voice=np.concatenate(parts)
# --- subtle robot treatment: ring-mod blend + short metallic comb, keeps intelligibility
n=np.arange(len(voice))/SR
ring=voice*np.sin(2*np.pi*55*n)
d=int(0.006*SR); comb=np.concatenate([np.zeros(d),voice[:-d]])
robo=0.72*voice+0.22*ring+0.28*comb
robo/=np.max(np.abs(robo))+1e-9; robo*=0.9
total=t+0.4
json.dump({'timeline':tl,'duration':round(total,3)},open('timeline.json','w'),indent=1)
def w(name,x):
    x=np.clip(x,-1,1); 
    with wave.open(name,'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((x*32767).astype(np.int16).tobytes())
w('voice.wav',np.concatenate([robo,np.zeros(int(0.4*SR))]))
print(json.dumps(tl,indent=0)); print('dur',total)
# per-frame mouth envelope (30fps)
FPS=30; hop=SR//FPS
env=[float(np.sqrt(np.mean(voice[i:i+hop]**2))) for i in range(0,len(voice),hop)]
m=max(env); env=[round(min(1,(e/m)**0.6*1.1),3) for e in env]
d=json.load(open('timeline.json')); d['env']=env; json.dump(d,open('timeline.json','w'))
