# Generates the Amharic narration with espeak-ng and writes timeline.json
import subprocess, wave, json
LINES = [
  "ሰላም! እኔ ሮቦት መምህራችሁ ነኝ። ዛሬ ስለ ክሎድ ኤ.አይ እንማር።",
  "ክሎድ በአንትሮፒክ የተሰራ ብልህ የኤ.አይ ረዳት ነው።",
  "ይጽፋል፣ ኮድ ይሰራል፣ ይተረጉማል፣ ያስረዳል።",
  "ጥያቄዎን በአማርኛ ይጠይቁት፣ ወዲያውኑ ይረዳዎታል።",
  "ጠቃሚ፣ ታማኝ እና ደህንነቱ የተጠበቀ ነው። ዛሬውኑ ይሞክሩት!",
]
LEAD, TAIL, OUTRO = 0.35, 0.35, 1.2
starts, vo, t = [], [], 0.0
for i, line in enumerate(LINES):
    f = f"vo/line{i}.wav"
    subprocess.run(["espeak-ng", "-v", "am", "-s", "182", "-p", "58", "-g", "3", "-w", f, line], check=True)
    w = wave.open(f); d = w.getnframes() / w.getframerate()
    starts.append(round(t, 3)); vo.append({"start": round(t + LEAD, 3), "dur": round(d, 3), "file": f})
    t += LEAD + d + TAIL
total = round(t + OUTRO, 3)
json.dump({"starts": starts, "total": total, "vo": vo}, open("timeline.json", "w"), indent=1)
print(starts, total)
