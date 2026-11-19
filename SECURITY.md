# Security

This repository holds a public website and, under `crm/`, the source code of a
customer management application. **It never holds customer data.** The
application keeps all customer data encrypted inside the user's own browser.

## Reporting a problem

Please do not open a public issue for a security problem. Use GitHub's
"Report a vulnerability" button on the Security tab of this repository, so the
report stays private until it is fixed.

## What protects the CRM

- Data is encrypted in the browser with AES-256-GCM under a random data key.
  The key is locked with the passphrase (PBKDF2-SHA256, 1,000,000 rounds),
  optionally together with a passkey, and optionally with a recovery code.
- Each page allows only its own scripts, identified by fingerprint; injected
  scripts do not run. The app refuses to run inside another site's frame.
- Every change is checked automatically: tests, a scan for known vulnerable
  packages, GitHub code scanning, and a guard against committed data files.

Details: `crm/README.md`, section "Security measures in the app".

## Rules for contributors

- Never commit real customer data, exports, backups or brochures.
- Test data must be invented.
- Changes reach the live site only through a pull request with green checks.
