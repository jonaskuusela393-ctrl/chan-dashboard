# Raccoon North Business Command

A private Vercel/Neon operating dashboard plus a public bilingual website-service landing page.

## Public site

The public site is available without an account and includes:

- professional English/Finnish service wording
- plain-language packages and a non-binding estimate calculator
- public project enquiry form
- no-login client support/change-request form using a private project code
- company, privacy, cookie, B2B terms, accessibility and data-processing pages

Customers cannot register or log into the private dashboard.

## Private admin tools

- green-terminal Google Places lead finder and accurate OpenStreetMap street map
- contact discovery and website audits
- Gmail inbox/replies and Twilio SMS
- CRM pipeline, contacts, tasks, proposals, inquiries and money tracking
- client website records: online/offline/maintenance state, ownership, URLs, repository, support plan, requests and project log
- optional Claude-assisted drafting with safe built-in fallback

## Deployment

1. Create/connect a Neon Postgres database and add the pooled `DATABASE_URL` to Vercel.
2. Run `NEON_SCHEMA.sql` once in the Neon SQL Editor. Runtime schema creation is also included for the new client tables.
3. Copy `.env.example` values into Vercel and replace every placeholder.
4. Add a long `AUTH_SECRET`, admin credentials and your real legal business details.
5. Deploy to Vercel and connect the public domain.
6. Test the landing-page forms, support-code flow, Gmail/Twilio integrations and website-status checks.

## Required legal setup

`Raccoon North Web Studio` is a working name, not proof of registration or exclusivity. Before commercial use:

- check and register the company/trading name as appropriate
- set the actual legal name, Business ID, address, contact information and VAT status
- review the legal templates against the real legal form, services, providers and customer type
- obtain Finnish professional legal/accounting review where needed

See `LEGAL_SETUP_CHECKLIST.md`, `SERVICE_AGREEMENT_TEMPLATE.md`, `DATA_PROCESSING_AGREEMENT_TEMPLATE.md` and `MAINTENANCE_SLA_TEMPLATE.md`.

## Optional Claude layer

Set:

```env
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5
```

Claude is used only to improve admin drafts. If it is not configured, rejects a request, reaches a limit, times out or returns an error, the route returns the built-in draft. Maps, CRM, email, SMS, estimates, client records and public forms do not depend on Claude.

## Build

```bash
npx --yes pnpm@10.13.1 install --frozen-lockfile
npx --yes pnpm@10.13.1 build
```

## Git

```bash
git add .
git commit -m "Jonas"
git push
```
