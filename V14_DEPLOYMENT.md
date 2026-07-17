# Raccoon Signal v14 deployment

1. Run `NEON_SCHEMA.sql` in Neon SQL Editor.
2. Add all existing environment variables and the V14 variables from `.env.example` to Vercel.
3. Set a separate `CREDENTIAL_ENCRYPTION_KEY`; changing it later makes stored customer API keys unreadable.
4. Create Stripe recurring prices and copy their `price_...` IDs into the three STRIPE_PRICE variables.
5. Create a Stripe webhook pointing to `/api/billing/webhook`, listening to checkout and subscription lifecycle events.
6. Verify a sending domain in Resend for verification and password-reset email.
7. Configure Twilio only if phone verification/SMS is required.
8. Generate an owner TOTP secret, add it to your authenticator app and set `ADMIN_TOTP_SECRET`.
9. Apply real legal company fields before publishing.
10. Test registration, email verification, reset, checkout, cancellation, customer isolation and administrator ban/restore using test accounts.
