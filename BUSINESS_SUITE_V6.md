# Business Command v6

This release keeps the original black and neon-green terminal presentation while turning the business area into a connected operating system.

## Included

- Grid-based Google Places lead searching with deduplication and search history
- Accurate green-terminal street map with roads, cities, draggable navigation, zoom, and exact lead coordinates
- Fast static contact scan plus optional Browserless rendered fallback
- Multiple contacts per company with source, confidence, verification, and primary-contact state
- Kanban CRM, company timeline, notes, tasks, follow-up dates, CSV export, and duplicate-safe lead records
- Gmail OAuth inbox with search, full threads, attachments, read/unread, archive, send, and reply
- Twilio SMS send, inbound reply webhook, delivery status webhook, and CRM history
- PageSpeed/Lighthouse audits, broken-link checks, screenshots, issue lists, and downloadable reports
- Per-company proposals, line items, deposits, recurring charges, revision limits, delivery terms, and invoice creation
- Website inquiry inbox backed by Neon
- Generated customer sites can deliver each quote request to the dashboard CRM and optionally Resend email
- Revenue, unpaid invoices, expenses, profit, recurring revenue, and conversion summaries

## Production setup

1. Run `NEON_SCHEMA.sql` once in Neon SQL Editor.
2. Copy the new values from `.env.example` to Vercel Environment Variables.
3. Set `APP_BASE_URL` to the exact production dashboard origin.
4. Configure Google OAuth and add `/api/email/google/callback` as the redirect URI.
5. Configure Twilio inbound and status webhooks using the URLs shown in the Setup tab.
6. Set `INQUIRY_WEBHOOK_SECRET` to a long random value before exporting customer sites.
7. Redeploy.

Optional Browserless and PageSpeed keys improve rendered contact discovery, screenshots, and quota, but the rest of the dashboard works without them.
