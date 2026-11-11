# German Top 1000: Anki deck

The 1,000 most common German words, in frequency order, for the "30 new words a day" plan.

- **Word list:** [lenguia.com, 1000 Most Common German Words](https://www.lenguia.com/tools/most-common-words/german) (rank, English meaning, word type, CEFR level, der/die/das)
- **Added here:** noun plurals and a short example sentence with English translation for every word (written for this deck, so they may have the occasional mistake; fix any you spot right in Anki)

## Files

| File | What it is |
|---|---|
| `German_Top_1000.apkg` | The Anki deck. Open it, or use File → Import in Anki |
| `German_Top_1000.tsv` | The same words as a spreadsheet |
| `words.json`, `enriched.json` | Source data |
| `build_deck.py` | Rebuilds the deck from the source data |

## What a card looks like

- **Front:** the German word, colour-coded by gender (der = blue, die = red, das = green), with its word type. Anki reads it aloud with your device's German voice.
- **Back:** the English meaning, the plural, an example sentence (also read aloud), the frequency rank and the CEFR level.

## Set it up (once)

1. Install Anki (desktop, AnkiDroid, or AnkiMobile) and import `German_Top_1000.apkg`.
2. Click the gear next to the deck → **Options**:
   - **New cards/day:** 30
   - **Maximum reviews/day:** 9999, so reviews never get stuck behind a limit
   - **FSRS:** on (under Advanced)
   - Leave the new-card order as it is. The cards already come in frequency order.
3. If you hear no audio, install a German voice on your device (on Windows: Settings → Time & Language → Speech).

## Your countdown

- **Words not started yet:** Browse → search `deck:"German Top 1000" is:new`. The count is shown at the top.
- **Words learned:** Stats → Card Counts. "Mature" cards are ones you've remembered across 3+ weeks.

## Optional: also practise English → German

Each note has an empty **Reverse** field. Fill it in, and Anki adds a second card that shows the English and asks you for the German.

To turn this on for every word: Browse → select all the deck's cards → Notes → **Find and Replace**. Find `^$`, replace with `y`, set **In** to `Reverse`, and tick "Treat input as regular expression". This doubles your daily reviews, so it's best done after you've finished the first pass.

## Rebuild

```bash
pip install genanki
python3 build_deck.py
```

Re-importing a rebuilt deck updates the cards you already have and keeps your progress.
