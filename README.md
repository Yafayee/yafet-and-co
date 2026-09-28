# Yafet & Co. — website

Static site published to GitHub Pages. Every push to `main` is copied to the
`gh-pages` branch by `.github/workflows/pages.yml`.

## Structure

```
index.html            Homepage markup (section shells; text is filled in by js/content.js)
styles/
  base.css            Design tokens, reset, typography, layout primitives, section markers
  components.css      Nav, buttons, marquee, cards, modals, form fields
  sections.css        One block per homepage section, in page order
js/
  content.js          All homepage copy (EN + DE placeholders)
  motion.js           Smooth scroll, reveals, counters, pinned work gallery
  interactions.js     Rendering from content.js, language/theme toggles, modals,
                      estimator, contact form, "Ask the studio" chat
habits/               "The 1% System" habit tracker (installable web app)
resources/            Study notes (Markdown)
archive/              Old snapshots kept for reference; not published
```

## Homepage section order

Hero → partners → § 01 Services → stats → the & principle → § 02 Work →
§ 03 Four S pillars → § 04 Process → testimonial → § 05 Pricing → estimator →
§ 06 Journal → FAQ → Contact → footer.

The nav links follow the same order. Their labels come from `nav.links` in
`js/content.js` and are matched by position, so keep both lists in sync.

## Local preview

```
python3 -m http.server 8000
```

Then open http://localhost:8000/.
