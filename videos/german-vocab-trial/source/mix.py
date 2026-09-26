import numpy as np, json, wave
SR=44100
d=json.load(open('timeline.json')); T=d['duration']; N=int(T*SR)
tl={x['id']:x for x in d['timeline']}
with wave.open('voice.wav') as f: v=np.frombuffer(f.readframes(f.getnframes()),np.int16)/32767; vsr=f.getframerate()
voice=np.interp(np.arange(N)/SR, np.arange(len(v))/vsr, v, right=0)
rng=np.random.default_rng(3)
def lp(x,a):  # one-pole lowpass
    y=np.empty_like(x); s=0.
    for i in range(len(x)): s+=a*(x[i]-s); y[i]=s
    return y
def mtof(m): return 440*2**((m-69)/12)
bpm=104; beat=60/bpm; t=np.arange(N)/SR
music=np.zeros(N)
chords=[[57,60,64],[53,57,60],[48,55,60,64],[55,59,62]]  # Am F C G
bar=beat*4
for bi in range(int(T/bar)+1):
    ch=chords[bi%4]; s=int(bi*bar*SR); e=min(N,int((bi+1)*bar*SR))
    if s>=N: break
    tt=np.arange(e-s)/SR
    pad=sum(np.sin(2*np.pi*mtof(m)*tt)*0.5+np.sin(2*np.pi*mtof(m)*1.003*tt)*0.3+np.sin(2*np.pi*mtof(m+12)*tt)*0.08 for m in ch)
    envp=np.minimum(1,tt/0.25)*np.minimum(1,(bar-tt)/0.3)
    music[s:e]+=pad*envp*0.05
    # bass
    music[s:e]+=np.sin(2*np.pi*mtof(ch[0]-24)*tt)*0.12*np.exp(-((tt%beat)*2.5))
    # pluck arp 8ths
    for k in range(8):
        ps=s+int(k*beat/2*SR); 
        if ps>=N: break
        L=min(int(0.35*SR),N-ps); pt=np.arange(L)/SR
        note=ch[[0,1,2,1,0,2,1,2][k]%len(ch)]+12
        music[ps:ps+L]+=np.sign(np.sin(2*np.pi*mtof(note)*pt))*0.018*np.exp(-pt*14)+np.sin(2*np.pi*mtof(note)*pt)*0.03*np.exp(-pt*9)
# drums
for k in range(int(T/beat)+1):
    s=int(k*beat*SR)
    if s>=N: break
    L=min(int(.3*SR),N-s); kt=np.arange(L)/SR
    if k>=2: music[s:s+L]+=np.sin(2*np.pi*(50+90*np.exp(-kt*30))*kt)*np.exp(-kt*9)*0.32
    for h in (0,0.5):
        hs=s+int(h*beat*SR); 
        if hs>=N: continue
        HL=min(int(.05*SR),N-hs); nz=rng.standard_normal(HL); nz=nz-lp(nz,0.4)
        music[hs:hs+HL]+=nz*np.exp(-np.arange(HL)/SR*80)*0.035
    if k%2==1 and k>=2:
        L=min(int(.18*SR),N-s); nz=rng.standard_normal(L); music[s:s+L]+=(nz-lp(nz,0.1))*np.exp(-np.arange(L)/SR*22)*0.08
music[:int(.02*SR)]*=np.linspace(0,1,int(.02*SR))
fade=int(1.2*SR); music[-fade:]*=np.linspace(1,0,fade)
# ducking
venv=lp(np.abs(voice),0.0015); duck=1-0.55*np.clip(venv/ (venv.max()+1e-9)*3,0,1)
music*=duck
# sfx
sfx=np.zeros(N)
def add(at,x):
    s=int(at*SR); L=min(len(x),N-s); 
    if s<N and L>0: sfx[s:s+L]+=x[:L]
def ding(f0=880):
    tt=np.arange(int(.6*SR))/SR
    return (np.sin(2*np.pi*f0*tt)+0.5*np.sin(2*np.pi*f0*2.01*tt)+0.25*np.sin(2*np.pi*f0*3*tt))*np.exp(-tt*7)*0.12
def pop():
    tt=np.arange(int(.12*SR))/SR
    return np.sin(2*np.pi*(300+900*tt/0.12)*tt)*np.exp(-tt*30)*0.25
def whoosh(L=0.6):
    n=int(L*SR); nz=rng.standard_normal(n); x=lp(nz,0.08)
    return x*np.sin(np.pi*np.arange(n)/n)**2*0.35
def boot():
    out=np.zeros(int(.7*SR))
    for i,f in enumerate([523,659,784,1047]):
        tt=np.arange(int(.14*SR))/SR; s=int(i*.1*SR)
        out[s:s+len(tt)]+=np.sign(np.sin(2*np.pi*f*tt))*0.05*np.exp(-tt*18)
    return out
add(0.05,boot())
for i,w in enumerate(['w1a','w2a','w3a','w4a']):
    add(tl[w]['start']-0.35,whoosh(0.4)); add(tl[w]['start']-0.06,pop()); add(tl[w.replace('a','b')]['start']-0.02,ding([880,988,1109,1319][i]))
add(tl['rule']['start']-0.5,whoosh(0.7))
[add(tl['exa']['start']+0.02+k*0.3,pop()) for k in range(4)]
add(tl['exb']['start'],ding(1175))
add(tl['outro']['start']-0.4,whoosh(0.6))
for i in range(6): add(tl['outro']['start']+1.5+i*0.07,ding(1568+i*120)*0.5)
mix=voice*1.0+music*0.9+sfx
mix/=np.max(np.abs(mix))/0.95
st=np.stack([mix,mix],1)
with wave.open('mix.wav','wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((st*32767).astype(np.int16).tobytes())
print('ok',T)
