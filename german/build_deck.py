"""Build the "German Top 1000" Anki deck.

Inputs (same folder):
  words.json     - 1000 words from lenguia.com (rank, word, translation, pos, cefr, gender)
  enriched.json  - plurals and example sentences, keyed by rank

Outputs:
  German_Top_1000.apkg  - import into Anki (File > Import)
  German_Top_1000.tsv   - the same data as a spreadsheet

Run: pip install genanki && python3 build_deck.py
"""

import copy
import csv
import html
import json
import re
import sqlite3
import tempfile
import time
import zipfile
from pathlib import Path

import genanki

HERE = Path(__file__).parent

# Fixed IDs so re-importing an updated deck updates cards instead of duplicating them.
MODEL_ID = 1731320001
DECK_ID = 1731320002
PRESET_ID = 1731320003

CSS = """
.card { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-size: 22px;
        text-align: center; color: #1f2328; background: #ffffff; line-height: 1.4; padding: 12px; }
.nightMode.card, .night_mode .card { color: #e6e6e6; background: #1e1e1e; }
.word { font-size: 44px; font-weight: 700; margin: 12px 0 4px; }
.pos  { font-size: 15px; color: #8a8f98; letter-spacing: .04em; text-transform: uppercase; }
.meaning { font-size: 28px; margin: 14px 0 6px; }
.plural { font-size: 18px; color: #6b7280; margin-bottom: 14px; }
.ex   { font-size: 20px; margin-top: 16px; }
.ex-en { font-size: 16px; color: #8a8f98; margin-top: 4px; font-style: italic; }
.meta { font-size: 12px; color: #a0a4ab; margin-top: 22px; }
.hint { font-size: 15px; color: #8a8f98; margin-top: 8px; }
/* Gender colours: der = blue, die = red, das = green */
.g-der { color: #2563eb; } .g-die { color: #dc2626; } .g-das { color: #16a34a; }
.nightMode .g-der, .night_mode .g-der { color: #60a5fa; }
.nightMode .g-die, .night_mode .g-die { color: #f87171; }
.nightMode .g-das, .night_mode .g-das { color: #4ade80; }
b { color: inherit; }
hr#answer { border: none; border-top: 1px solid #d0d4da; margin: 16px 0; }
"""

GERMAN_SIDE = """
<div class="pos">{{POS}}</div>
<div class="word g-{{Gender}}">{{German}}</div>
{{tts de_DE:German}}
"""

BACK_DETAILS = """
<div class="meaning">{{English}}</div>
{{#Plural}}<div class="plural">Plural: die {{Plural}}</div>{{/Plural}}
{{#ExampleDE}}
<div class="ex">{{ExampleDE}} {{tts de_DE:ExampleDE}}</div>
<div class="ex-en">{{ExampleEN}}</div>
{{/ExampleDE}}
<div class="meta">#{{Rank}} · {{CEFR}}</div>
"""

MODEL = genanki.Model(
    MODEL_ID,
    "German Frequency Word",
    fields=[{"name": n} for n in [
        "Rank", "German", "Word", "Gender", "Plural", "English",
        "POS", "CEFR", "ExampleDE", "ExampleEN", "Reverse",
    ]],
    templates=[
        {
            "name": "German → English",
            "qfmt": GERMAN_SIDE,
            "afmt": "{{FrontSide}}<hr id=answer>" + BACK_DETAILS,
        },
        {
            # Only created for notes whose "Reverse" field is filled in.
            "name": "English → German",
            "qfmt": """{{#Reverse}}
<div class="pos">{{POS}}</div>
<div class="meaning">{{English}}</div>
{{#Gender}}<div class="hint">der / die / das?</div>{{/Gender}}
{{/Reverse}}""",
            "afmt": """{{FrontSide}}<hr id=answer>
<div class="word g-{{Gender}}">{{German}}</div>
{{tts de_DE:German}}
{{#Plural}}<div class="plural">Plural: die {{Plural}}</div>{{/Plural}}
{{#ExampleDE}}<div class="ex">{{ExampleDE}}</div><div class="ex-en">{{ExampleEN}}</div>{{/ExampleDE}}
<div class="meta">#{{Rank}} · {{CEFR}}</div>""",
        },
    ],
    css=CSS,
    sort_field_index=0,
)


def bold(text: str) -> str:
    """Escape HTML, then turn **word** into <b>word</b>."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(text, quote=False))


def rank_band(rank: int) -> str:
    lo = (rank - 1) // 100 * 100 + 1
    return f"rank_{lo:04d}-{lo + 99:04d}"


DECK_DESCRIPTION = """
<b>30 new words a day, most common first.</b><br>
Do your reviews, then the new cards.<br><br>
Countdown: Browse &rarr; search <code>deck:"German Top 1000" is:new</code><br>
Learned: Stats &rarr; Card Counts &rarr; <i>Mature</i>
"""


def apply_deck_options(apkg: Path):
    """Give the deck its own options preset (30 new/day, no review cap) and a description.

    Anki imports the preset along with the deck, so nothing has to be set by hand.
    """
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(apkg) as z:
            z.extractall(tmp)
            names = z.namelist()
        db = sqlite3.connect(Path(tmp) / "collection.anki2")
        dconf_json, decks_json = db.execute("SELECT dconf, decks FROM col").fetchone()
        dconf, decks = json.loads(dconf_json), json.loads(decks_json)

        preset = copy.deepcopy(dconf["1"])
        preset.update(id=PRESET_ID, name="German Top 1000 (30/day)", mod=int(time.time()))
        preset["new"]["perDay"] = 30
        preset["new"]["order"] = 1  # show new cards in deck order (frequency rank)
        preset["rev"]["perDay"] = 9999
        dconf[str(PRESET_ID)] = preset

        deck = decks[str(DECK_ID)]
        deck["conf"] = PRESET_ID
        deck["desc"] = DECK_DESCRIPTION.strip()

        db.execute("UPDATE col SET dconf = ?, decks = ?", (json.dumps(dconf), json.dumps(decks)))
        db.commit()
        db.close()

        with zipfile.ZipFile(apkg, "w", zipfile.ZIP_DEFLATED) as z:
            for name in names:
                z.write(Path(tmp) / name, name)


def main():
    words = json.loads((HERE / "words.json").read_text(encoding="utf-8"))
    extra = {e["rank"]: e for e in json.loads((HERE / "enriched.json").read_text(encoding="utf-8"))}

    deck = genanki.Deck(DECK_ID, "German Top 1000")
    rows = []
    for w in sorted(words, key=lambda x: x["rank"]):
        e = extra.get(w["rank"], {})
        assert not e or e["word"] == w["word"], (w, e)
        gender = w.get("gender", "")
        german = f"{gender} {w['word']}" if gender else w["word"]
        plural = e.get("plural", "") if w["pos"] == "noun" else ""
        ex_de = e.get("example_de", "")
        ex_en = e.get("example_en", "")

        fields = [
            str(w["rank"]), html.escape(german), html.escape(w["word"]), gender,
            html.escape(plural), html.escape(w["translation"]), w["pos"], w["cefr"],
            bold(ex_de), html.escape(ex_en), "",
        ]
        note = genanki.Note(
            model=MODEL,
            fields=fields,
            guid=genanki.guid_for("german-top-1000", w["rank"], w["word"]),
            tags=[w["pos"], w["cefr"], rank_band(w["rank"])]
            + (["slang"] if re.search(r"vulgar|expletive", w["translation"]) else []),
            due=w["rank"],  # new cards appear in frequency order
        )
        deck.add_note(note)
        rows.append([w["rank"], german, plural, w["translation"], w["pos"], w["cefr"],
                     ex_de.replace("**", ""), ex_en])

    genanki.Package(deck).write_to_file(HERE / "German_Top_1000.apkg")
    apply_deck_options(HERE / "German_Top_1000.apkg")
    with open(HERE / "German_Top_1000.tsv", "w", encoding="utf-8", newline="") as f:
        out = csv.writer(f, delimiter="\t")
        out.writerow(["Rank", "German", "Plural", "English", "Type", "CEFR",
                      "Example (DE)", "Example (EN)"])
        out.writerows(rows)
    print(f"Wrote {len(rows)} notes")


if __name__ == "__main__":
    main()
