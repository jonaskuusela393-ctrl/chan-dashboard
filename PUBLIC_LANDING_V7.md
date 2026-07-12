# Public Landing Page v7

## What changed

- Root `/` is now a public website-service landing page.
- Admin operations moved to `/dashboard`.
- 4chan and Reddit pages, APIs and libraries were removed.
- Added a configurable project estimate calculator.
- Added public estimate and general-contact forms.
- Public requests automatically enter the Neon CRM, inquiry inbox, contact list, activity timeline and follow-up tasks.
- Added optional Resend notifications.
- Added optional Cloudflare Turnstile validation.
- Added privacy, service terms, robots and sitemap routes.
- Login returns admins to `/dashboard` and the second account to `/chat`.

## Before publishing

Replace or confirm:

- `NEXT_PUBLIC_SERVICE_NAME`
- `NEXT_PUBLIC_SERVICE_EMAIL`
- `NEXT_PUBLIC_SERVICE_LOCATION`
- `APP_BASE_URL`
- privacy-controller contact information
- actual company/business identity
- final package prices and tax treatment
- proposal and cancellation terms

The calculator prices are recommendations stored in `lib/estimate.ts`. Edit that one file to change all public estimate calculations.
