# CP Consulting CRM

Customer relationship and communication platform for an insurance and
financial adviser. It runs entirely in the browser: there is no server and no
running cost.

## How data is kept

- Customer data is stored only in the browser of the device you use
  (IndexedDB), encrypted with AES-256-GCM. The key comes from your passphrase
  (PBKDF2, 600,000 rounds) and is held in memory only while unlocked.
- Nothing is uploaded. Imported files are read on the device.
- There is no passphrase reset. Download an encrypted backup regularly
  (Settings) and restore it on another device to move.
- The demo uses invented customers and saves nothing.

## What it does

| Screen | Purpose |
|---|---|
| Dashboard | Key figures, birthdays, strongest opportunities, replies, channel performance |
| Customers | Search, filters (product held or missing, consent, life stage, no contact), add by hand |
| Customer profile | Details, consent per channel, policies, recommendations, history, tasks, data export and deletion |
| Opportunities | Every rule-found opportunity with status: open, contacted, won, dismissed |
| Approvals | Suggested product messages, only for customers who agreed to offers and outside the frequency limit |
| Replies & tasks | Logged customer replies and follow-up tasks |
| Campaigns | Greeting and product campaigns with a per-recipient send list and a mail-merge export |
| Product guide | What the system knows about each product and the rules for talking about it, written from provided material |
| Import | Excel (.xlsx) or CSV import with column matching, validation, merging of duplicate rows |
| Settings | Signature, frequency limit, message texts, backup, passphrase, activity record |

Sending works without a server: each Send button opens your own email,
WhatsApp or SMS app with the message filled in and records it in the
customer's history. For many emails at once, export the list for a mail merge.

## Run it on your own computer

You need Node.js 20 or newer installed.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The address only works on the computer where
these commands are running.

## Put it on a web domain

```bash
npm run build
```

This writes plain static files to the `out/` folder. Upload the contents of
`out/` to the root folder of a domain or subdomain on any web hosting. The site
must be served over HTTPS, which the encryption needs.

If the files must live in a subfolder such as `example.com/crm`, build with
`BASE_PATH=/crm npm run build` instead.

Data is tied to the address the app is opened from. Moving the app to another
address means restoring a backup there.

## Where things live

- `src/lib/rules.ts`: recommendation rules, audiences, message suggestions.
- `src/lib/importer.ts`: spreadsheet parsing, validation and merging.
- `src/lib/crypto.ts`, `src/lib/store.tsx`: encryption and storage.
- `src/lib/knowledge.ts`: product guide and conduct rules, each with its source. Add an entry when new material is provided; do not copy the provider's wording or example figures.
- `src/lib/compliance.ts`: warnings for figures and promises in a drafted message.
- `src/lib/templates.ts`: default message texts in German and English.
- `src/lib/demo.ts`: generator for the invented demo customers.
- `src/app/globals.css`: colours and fonts, taken from cpconsulting.at.

## Rule for this repository

Never commit real customer data. The repository holds code only.
