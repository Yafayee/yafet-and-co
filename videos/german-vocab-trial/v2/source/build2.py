"""Assemble final audio for the Frau Lena video from per-line wav files.
usage: python3 build2.py <lines_dir>   (expects <id>.wav for every id in SCRIPT)
writes mix2.wav + timeline2.json (timeline, duration, env for lip sync)"""
import sys, json, subprocess, numpy as np, imageio_ffmpeg
from opts_audio_lib import uke_music, pluck, mtof
FF = imageio_ffmpeg.get_ffmpeg_exe(); SR = 44100
LD = sys.argv[1]
# (id, pause after in seconds)
SCRIPT = [('intro', .45), ('w1a', .28), ('w1b', .6), ('w2a', .28), ('w2b', .6), ('w3a', .28), ('w3b', .6),
          ('w4a', .28), ('w4b', .65), ('rule', .35), ('exa', .3), ('exb', .55), ('outro', .2), ('tsch', .9)]

def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.int16) / 32768
    idx = np.where(np.abs(a) > 0.005)[0]
    a = a[max(idx[0] - int(.03 * SR), 0): idx[-1] + int(.08 * SR)]
    n = int(.012 * SR); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.12  # loudness-match lines (RMS)

lead = 0.55; t = lead; parts = [np.zeros(int(lead * SR))]; tl = []
for sid, pause in SCRIPT:
    a = load(f'{LD}/{sid}.wav')
    tl.append({'id': sid, 'start': round(t, 3), 'end': round(t + len(a) / SR, 3)})
    parts += [a, np.zeros(int(pause * SR))]; t += len(a) / SR + pause
voice = np.concatenate(parts); T = t + 0.3; N = int(T * SR)
voice = np.pad(voice, (0, N - len(voice)))
# gentle "studio" polish: light compression + warmth
def lp(x, a):
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)
try:
    import scipy  # noqa
except ImportError:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'scipy'])
env_fast = lp(np.abs(voice), 0.002)
gain = 1 / np.maximum(1, (env_fast / 0.10) ** 0.35)
voice = voice * gain
voice = voice / np.max(np.abs(voice)) * 0.9

rng = np.random.default_rng(5)
music = uke_music(T)
music[:int(.3 * SR)] *= np.linspace(0, 1, int(.3 * SR))
fd = int(1.2 * SR); music[-fd:] *= np.linspace(1, 0, fd)
music /= np.max(np.abs(music))
venv = lp(np.abs(voice), 0.0015)
duck = 1 - 0.6 * np.clip(venv / (venv.max() + 1e-9) * 3, 0, 1)
music *= duck * 0.32

sfx = np.zeros(N)
def add(at, x):
    s = int(at * SR); L = min(len(x), N - s)
    if s >= 0 and L > 0: sfx[s:s + L] += x[:L]
def ding(f0=880, v=.1):
    tt = np.arange(int(.7 * SR)) / SR
    return (np.sin(2 * np.pi * f0 * tt) + .4 * np.sin(2 * np.pi * f0 * 2.76 * tt) * np.exp(-tt * 9)) * np.exp(-tt * 6) * v
def pop(v=.18):
    tt = np.arange(int(.1 * SR)) / SR
    return np.sin(2 * np.pi * (380 + 1100 * tt / .1) * tt) * np.exp(-tt * 38) * v
def swish(L=.35, v=.12):
    n = int(L * SR); x = lp(rng.standard_normal(n), 0.12); x -= lp(x, 0.02)
    return x * np.sin(np.pi * np.arange(n) / n) ** 2 * v
def xylo_run(notes, step=.07, v=.07):
    out = np.zeros(int((len(notes) * step + .6) * SR))
    for i, m in enumerate(notes):
        tt = np.arange(int(.5 * SR)) / SR; s = int(i * step * SR)
        out[s:s + len(tt)] += (np.sin(2 * np.pi * mtof(m) * tt) + .25 * np.sin(2 * np.pi * mtof(m) * 4 * tt)) * np.exp(-tt * 10) * v
    return out
TLd = {x['id']: x for x in tl}
add(0.05, xylo_run([72, 76, 79, 84]))
for i, w in enumerate(['w1a', 'w2a', 'w3a', 'w4a']):
    add(TLd[w]['start'] - .42, swish()); add(TLd[w]['start'] - .05, pop())
    add(TLd[w.replace('a', 'b')]['start'] - .03, ding([1047, 1175, 1319, 1397][i]))
add(TLd['rule']['start'] - .55, swish(.5, .14))
for k in range(4): add(TLd['exa']['start'] + .02 + k * .3, pop(.14))
add(TLd['exb']['start'] - .03, ding(1568, .09))
add(TLd['outro']['start'] - .4, swish(.4))
add(TLd['tsch']['end'] + .05, xylo_run([84, 79, 76, 72, 76, 79, 84, 88], .06, .06))

mix = voice + music + sfx
mix = mix / np.max(np.abs(mix)) * 0.97
import wave
with wave.open('mix2.wav', 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.stack([mix, mix], 1) * 32767).astype(np.int16).tobytes())
FPS = 30; hop = SR // FPS
env = [float(np.sqrt(np.mean(voice[i:i + hop] ** 2))) for i in range(0, N, hop)]
m = np.percentile(env, 97); env = [round(min(1, (e / m) ** .7), 3) for e in env]
json.dump({'timeline': tl, 'duration': round(T, 3), 'env': env}, open('timeline2.json', 'w'))
print('duration', round(T, 2)); print(json.dumps(tl))
