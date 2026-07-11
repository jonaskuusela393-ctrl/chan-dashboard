# v4 rebuild summary

## Client Radar

- Replaced the static SVG world map with an exact-coordinate OpenStreetMap street map.
- Added drag, wheel zoom, double-click zoom, fit-results, searched-area reset and center reuse.
- Added Google Geocoding for written cities/areas.
- Added multi-query, paginated Google Places (New) search with service-area businesses.
- Search can use up to 6 query variants × 3 pages and deduplicates Place IDs.
- Removed the old one-page/20-result and 10-site bulk limits.

## Contact discovery

- Crawls homepage, common contact/about/team/booking/quote paths, robots.txt, sitemaps and discovered contact links.
- Finds standard/obfuscated emails, mailto links, Cloudflare emails, JavaScript escapes, JSON-LD, phone numbers, forms and social profiles.
- Supports Facebook, Instagram, LinkedIn, TikTok, WhatsApp and Messenger.
- Displays scan results as usable buttons instead of only raw JSON.
- Bulk scans every currently filtered website in reliable four-site server batches.

## Client website generator

- Added downloadable standalone Next.js client-project ZIP.
- Includes mobile layout, call/email/map actions, services, portfolio placeholders and quote form.
- Contact form sends server-side through Resend with validation and a honeypot.
- Generated project was independently installed and production-built successfully.

## Vercel / Neon / security

- Added SSRF-safe website fetching with private/reserved network and redirect blocking.
- Expanded Neon CRM schema for all contact/social fields.
- Added private Vercel Blob chat attachment storage and authenticated file delivery.
- Changed chat polling to retrieve only newer messages after initial load.
- Added upload signature checks and a 4 MB combined Vercel-safe limit.
- Added login throttling and temporary lockouts.
- Disabled Dev Workspace on production/Vercel unless deliberately overridden.
- Fixed SMTP subject header injection.
- Added security headers and removed X-Powered-By.
- Added PostCSS override; production audit reports zero known vulnerabilities.
- Removed bundled Git history, obsolete build logs and unused 600 KB world-map data from the distributable ZIP.
