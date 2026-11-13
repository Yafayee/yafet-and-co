# CP Consulting CRM

Customer relationship and communication platform. This is the interface
preview: every screen works in the browser, but it runs on invented sample
customers. Nothing is sent and nothing is saved yet.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

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
