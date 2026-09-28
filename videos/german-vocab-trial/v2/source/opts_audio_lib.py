import numpy as np
SR = 44100
rng = np.random.default_rng(1)
def pluck(freq, dur, bright=0.5):
    n = int(dur * SR); p = int(SR / freq)
    buf = rng.uniform(-1, 1, p); out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out * np.exp(-np.arange(n) / SR * 2.5)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

def uke_music(T):
    N = int(T * SR); out = np.zeros(N); bpm = 112; beat = 60 / bpm
    chords = [[60, 64, 67, 72], [55, 62, 67, 71], [57, 64, 69, 72], [53, 60, 65, 69]]  # C G Am F
    strum = [(0, 1), (1, 1), (1.5, -1), (2.5, -1), (3, 1), (3.5, -1)]
    cache = {}
    k = 0
    while True:
        bar_t = k * 4 * beat
        if bar_t >= T: break
        ch = chords[k % 4]
        for off, d in strum:
            t0 = bar_t + off * beat
            if t0 >= T: break
            notes = ch if d > 0 else ch[::-1]
            for j, m in enumerate(notes):
                key = m
                if key not in cache: cache[key] = pluck(mtof(m), 1.2)
                s = int((t0 + j * 0.012) * SR); x = cache[key] * (0.22 if d > 0 else 0.15)
                L = min(len(x), N - s)
                if L > 0: out[s:s + L] += x[:L]
        # bass + shaker + glockenspiel melody
        for b in range(4):
            s = int((bar_t + b * beat) * SR); L = min(int(0.4 * SR), N - s)
            if L <= 0: continue
            tt = np.arange(L) / SR
            out[s:s + L] += np.sin(2 * np.pi * mtof(ch[0] - 24) * tt) * np.exp(-tt * 6) * 0.25
            for h in (0, 0.5):
                hs = s + int(h * beat * SR); HL = min(int(0.06 * SR), N - hs)
                if HL > 0: out[hs:hs + HL] += rng.standard_normal(HL) * np.exp(-np.arange(HL) / SR * 60) * 0.03
        mel = [ch[3] + 12, ch[2] + 12, ch[3] + 12, ch[1] + 12]
        for b, m in enumerate(mel):
            s = int((bar_t + b * beat + 0.5 * beat) * SR); L = min(int(0.5 * SR), N - s)
            if L > 0:
                tt = np.arange(L) / SR
                out[s:s + L] += (np.sin(2 * np.pi * mtof(m) * tt) + 0.3 * np.sin(2 * np.pi * mtof(m) * 4 * tt)) * np.exp(-tt * 7) * 0.07
        k += 1
    return out

