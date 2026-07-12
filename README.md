# Website Business Command v7

A Next.js application for running a small website-service business on Vercel and Neon.

It now has two clearly separated sides:

- **Public website:** service explanation, project estimate calculator, contact form, privacy notice and service terms.
- **Private operations dashboard:** lead finder, green terminal map, contact scanner, CRM, Gmail inbox, SMS, audits, proposals, client-site export, inquiries, revenue, chat and local-only development tools.

The old 4chan and Reddit modules have been removed.

## Public lead flow

A visitor can submit either a general message or an estimate request. A successful submission:

1. Creates a high-priority lead in `viewport_business_leads`.
2. Stores the complete request in the business inquiry inbox.
3. Adds the visitor's email and phone as separate CRM contacts.
4. Creates a high-priority reply task due within 24 hours.
5. Optionally emails an alert through Resend.

The estimate is calculated again on the server before it is stored. It is explicitly presented as a non-binding planning range.

## Private modules

Admin:

- Business Command
  - Google Places lead finder and grid searching
  - Black-and-neon-green accurate map
  - Static and Browserless-assisted contact discovery
  - Multiple contacts per company
  - Kanban CRM, tasks and timeline
  - Gmail inbox, threads and replies
  - Twilio SMS and delivery state
  - Website audits and screenshots
  - Proposals, invoices, payments and expenses
  - Generated Vercel-ready customer sites
  - Website inquiry inbox
- Email
- YouTube text browser
- Private chat
- Local-only Dev Workspace

The second private account remains chat-only. Server routes enforce this restriction.

## Install and build

```cmd
npx --yes pnpm@10.13.1 install
npx --yes pnpm@10.13.1 build
```

Development:

```cmd
npx --yes pnpm@10.13.1 dev
```

Windows build log:

```cmd
npx --yes pnpm@10.13.1 build > build-log.txt 2>&1 & notepad build-log.txt
```

## Vercel and Neon setup

1. Import the repository into Vercel.
2. Add the values from `.env.example`.
3. Use Neon's pooled `DATABASE_URL`.
4. Run `NEON_SCHEMA.sql` once in Neon SQL Editor.
5. Enable Google Places (New) and Geocoding if using the lead finder.
6. Connect a private Vercel Blob store if chat file uploads are needed.
7. Redeploy.

The public forms need Neon because they create CRM records. Resend is optional: when it is not configured, inquiries still appear inside **Business → Inquiries**.

## Public brand settings

```env
NEXT_PUBLIC_SERVICE_NAME=Jonas Web Studio
NEXT_PUBLIC_SERVICE_EMAIL=
NEXT_PUBLIC_SERVICE_LOCATION=Finland
PUBLIC_CONTACT_TO_EMAIL=
PUBLIC_CONTACT_FROM_EMAIL=Jonas Web Studio <website@your-verified-domain.com>
```

Optional public-form spam protection:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Create a Turnstile widget for the production domain and configure both values together. Leave both empty to use the built-in honeypot, minimum-fill-time check and basic request throttling.

## Recommended client ownership model

For most small-business projects:

- The client should own the domain registrar account.
- The client should preferably own the production Vercel account/project and paid third-party services.
- The developer is invited as a team member or project administrator.
- A normal brochure site can use Vercel without Neon.
- Add Neon only when the site needs stored inquiries, accounts, dashboards, dynamic records or other application data.
- The proposal must state who owns source code, domains, hosting accounts and data.
- Monthly care should be a separate service with a precise update allowance and exit process.

Managing everything under an agency account is possible, but the contract must explain billing, ownership, exports and what happens when the customer cancels.

## Generated client sites

Generated websites can save contact submissions in this dashboard and optionally send a copy through Resend. Configure each generated project with:

```env
DASHBOARD_INQUIRY_WEBHOOK=https://your-dashboard.vercel.app/api/business/inquiries/public
DASHBOARD_INQUIRY_SECRET=the-same-INQUIRY_WEBHOOK_SECRET
DASHBOARD_LEAD_ID=the-exported-company-id

RESEND_API_KEY=
CONTACT_TO_EMAIL=client@example.com
CONTACT_FROM_EMAIL=Website <website@your-verified-domain.com>
```

## Security notes

- Dev Workspace is disabled on Vercel and production by default.
- Website scanners block localhost, private networks, metadata IPs and unsafe redirects.
- Login failures are throttled.
- Public forms validate and recalculate estimates server-side.
- Gmail OAuth tokens are encrypted using `AUTH_SECRET` before database storage.
- Twilio webhook signatures are validated.
- Never expose production secrets through `NEXT_PUBLIC_` variables.
- Review and replace the generic privacy and service-terms text with business-specific legal information before accepting real customers.
