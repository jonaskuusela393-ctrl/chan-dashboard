# Security and retention operating policy

- Passwords: scrypt hashes; never reversible.
- Customer API credentials: AES-256-GCM encrypted with a separate production secret.
- Administrator: strong unique password plus optional TOTP required in production.
- Sessions: HttpOnly, Secure, SameSite=Lax; revoke banned accounts.
- Analytics: consent-based; no raw IP retention; pseudonymous hashes rotate when ANALYTICS_SALT changes.
- Verification codes: 15 minutes. Password resets: 45 minutes.
- Public form data: define and enforce a real deletion period.
- Closed customer account: export on request, then delete or anonymise after the contractual/legal retention period.
- Billing records: retain only what accounting law requires; payment-card data stays with Stripe.
- Logs: no secrets, passwords, API keys or message contents in production logs.
- Backups: encrypted, tested restoration, documented retention.
- Incidents: documented assessment, containment, customer communication and authority notification when legally required.
