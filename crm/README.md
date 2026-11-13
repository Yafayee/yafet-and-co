# CP Consulting CRM

Customer relationship and communication platform. This is the interface
preview: every screen works in the browser, but it runs on invented sample
customers. Nothing is sent and nothing is saved yet.

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
`out/` to the root folder of a domain or subdomain (for example
`crm.example.com`) on any web hosting; no Node.js or database is needed for
the preview.

If the files must live in a subfolder such as `example.com/crm`, build with
`BASE_PATH=/crm npm run build` instead.

## Screens

| Path | Screen |
|---|---|
| `/` | Dashboard: key figures, birthdays, opportunities, replies, channel performance |
| `/customers` | Search and filter all profiles |
| `/customers/[id]` | One profile: contact, consent, policies, recommendations, history |
| `/approvals` | Drafted product messages waiting for approval |
| `/inbox` | Customer replies and follow-up tasks |
| `/campaigns` | Greeting and product campaigns |
| `/import` | CSV import with column matching (read in the browser only) |
| `/settings` | Sending rules, automation, roles, activity record |
| `/login` | Sign-in screen (not connected yet) |

## Where things live

- `src/lib/rules.ts`: the product recommendation rules and message templates. These are real logic and carry over to the backend.
- `src/lib/data.ts`: generated sample data. Replaced by the database later.
- `src/app/globals.css`: colours and fonts, taken from cpconsulting.at.

## Rule for this repository

Never commit real customer data. Development uses the generated sample data only.
