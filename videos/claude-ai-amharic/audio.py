import numpy as np, wave
SR=44100; D=20.0; n=int(SR*D); t=np.arange(n)/SR
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
    L=int(4.2*SR); tt=np.arange(L)/SR; s=np.zeros(L)
    for m in ch:
        f=note(m)
        for det in (-0.12,0.12): s+=np.sin(2*np.pi*(f+det)*tt)+0.25*np.sin(2*np.pi*2*(f+det)*tt)
    add(s*env(L,1.0,1.2)*0.018, k*4)
    # bass
    b=note(ch[0]-24); L2=int(4*SR); tb=np.arange(L2)/SR
    add(np.sin(2*np.pi*b*tb)*env(L2,0.05,0.6)*0.10, k*4)
    # arpeggio plucks (8th notes at 120bpm)
    for s8 in range(16):
        m=ch[[0,1,2,3,2,1,2,3][s8%8]]+12; L3=int(0.35*SR); tp=np.arange(L3)/SR
        pl=(np.sin(2*np.pi*note(m)*tp)+0.3*np.sin(2*np.pi*2*note(m)*tp))*np.exp(-tp*9)
        add(pl*0.05, k*4+s8*0.25)
# kick + soft hat
for beat in range(40):
    L=int(0.25*SR); tk=np.arange(L)/SR
    if beat%2==0:
        add(np.sin(2*np.pi*(50+90*np.exp(-tk*30))*tk)*np.exp(-tk*14)*0.22, beat*0.5)
    hat=np.random.default_rng(beat).standard_normal(int(0.05*SR))*np.exp(-np.arange(int(0.05*SR))/SR*80)
    add(np.diff(hat,prepend=0)*0.03, beat*0.5+0.25)
# whooshes at scene changes
rng=np.random.default_rng(1)
for s0 in (0.0,3.9,7.9,11.9,15.9):
    L=int(0.6*SR); w=rng.standard_normal(L); w=np.convolve(w,np.ones(40)/40,'same')
    e=np.sin(np.linspace(0,np.pi,L))**2; add(w*e*0.35, s0)
# pops for pop-ins, robot chirps
def chirp(f0,f1,dur,vol):
    L=int(dur*SR); tt=np.arange(L)/SR; f=np.linspace(f0,f1,L)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*6)*vol
for p in (0.2,4.5,8.6,9.0,9.4,9.8,18.1): add(chirp(500,1400,0.18,0.12), p)
for p in (12.6,14.2,16.2,16.6,17.0): add(chirp(900,1300,0.12,0.10), p)
add(chirp(700,1500,0.12,0.12),0.35); add(chirp(1500,900,0.12,0.12),0.5)   # "beep-boop" hello
# fade out
fo=int(1.2*SR); out[-fo:]*=np.linspace(1,0,fo); out[:int(.05*SR)]*=np.linspace(0,1,int(.05*SR))
out=out/np.max(np.abs(out))*0.85
st=np.stack([out,out],1); data=(st*32767).astype(np.int16)
with wave.open('music.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('audio ok')
