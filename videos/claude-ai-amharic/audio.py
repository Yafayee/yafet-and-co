import numpy as np, wave, json
TL=json.load(open('timeline.json')); ST=TL['starts']+[TL['total']]
def real(d):  # design time (4s grid) -> real time
    k=min(int(d//4),4); return ST[k]+(d-4*k)/4*(ST[k+1]-ST[k])
SR=44100; D=TL['total']; n=int(SR*D); t=np.arange(n)/SR
out=np.zeros(n)
def note(f): return 440*2**((f-69)/12)
def env(length, a=0.01, r=0.3):
    e=np.ones(length); ai=int(a*SR); ri=int(r*SR)
    e[:ai]=np.linspace(0,1,ai); e[-ri:]*=np.linspace(1,0,ri); return e
def add(sig, start):
    i=int(start*SR); j=min(n,i+len(sig)); out[i:j]+=sig[:j-i]
# chord pads: C  Am  F  G  C (4s each)
chords=[[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67],[60,64,67,72]]
for k,ch in enumerate(chords):
    seg=ST[k+1]-ST[k]; L=int((seg+0.2)*SR); tt=np.arange(L)/SR; s=np.zeros(L)
    for m in ch:
        f=note(m)
        for det in (-0.12,0.12): s+=np.sin(2*np.pi*(f+det)*tt)+0.25*np.sin(2*np.pi*2*(f+det)*tt)
    add(s*env(L,1.0,1.2)*0.018, ST[k])
    # bass
    b=note(ch[0]-24); L2=int(seg*SR); tb=np.arange(L2)/SR
    add(np.sin(2*np.pi*b*tb)*env(L2,0.05,0.6)*0.10, ST[k])
    # arpeggio plucks (8th notes at 120bpm)
    for s8 in range(int(seg/0.25)):
        m=ch[[0,1,2,3,2,1,2,3][s8%8]]+12; L3=int(0.35*SR); tp=np.arange(L3)/SR
        pl=(np.sin(2*np.pi*note(m)*tp)+0.3*np.sin(2*np.pi*2*note(m)*tp))*np.exp(-tp*9)
        add(pl*0.05, ST[k]+s8*0.25)
# kick + soft hat
for beat in range(int(D/0.5)):
    L=int(0.25*SR); tk=np.arange(L)/SR
    if beat%2==0:
        add(np.sin(2*np.pi*(50+90*np.exp(-tk*30))*tk)*np.exp(-tk*14)*0.22, beat*0.5)
    hat=np.random.default_rng(beat).standard_normal(int(0.05*SR))*np.exp(-np.arange(int(0.05*SR))/SR*80)
    add(np.diff(hat,prepend=0)*0.03, beat*0.5+0.25)
# whooshes at scene changes
rng=np.random.default_rng(1)
for s0 in [max(0,x-0.1) for x in ST[:5]]:
    L=int(0.6*SR); w=rng.standard_normal(L); w=np.convolve(w,np.ones(40)/40,'same')
    e=np.sin(np.linspace(0,np.pi,L))**2; add(w*e*0.35, s0)
# pops for pop-ins, robot chirps
def chirp(f0,f1,dur,vol):
    L=int(dur*SR); tt=np.arange(L)/SR; f=np.linspace(f0,f1,L)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*6)*vol
for p in (0.2,4.5,8.6,9.0,9.4,9.8,18.1): add(chirp(500,1400,0.18,0.12), real(p))
for p in (12.6,14.2,16.2,16.6,17.0): add(chirp(900,1300,0.12,0.10), real(p))
# fade out
fo=int(1.0*SR); out[-fo:]*=np.linspace(1,0,fo); out[:int(.05*SR)]*=np.linspace(0,1,int(.05*SR))
music=out/np.max(np.abs(out))
# narration: espeak-ng lines, resampled to 44.1k, with music ducked underneath
voice=np.zeros(n); duck=np.ones(n)
for v in TL['vo']:
    w=wave.open(v['file']); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)/32768
    x=np.interp(np.arange(int(len(x)*SR/sr))*sr/SR, np.arange(len(x)), x)
    x=x+0.18*np.concatenate([np.zeros(int(.045*SR)), x[:-int(.045*SR)]])   # light slap-back for a 'robot in a classroom' feel
    i=int(v['start']*SR); voice[i:i+len(x)]+=x[:n-i]
    a=max(0,i-int(.15*SR)); b=min(n,i+len(x)+int(.2*SR)); duck[a:b]=0.38
duck=np.convolve(duck,np.ones(int(.15*SR))/int(.15*SR),'same')
voice=voice/np.max(np.abs(voice))
out=music*duck*0.55+voice*0.95
out=out/np.max(np.abs(out))*0.9
st=np.stack([out,out],1); data=(st*32767).astype(np.int16)
with wave.open('mix.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('audio ok')
