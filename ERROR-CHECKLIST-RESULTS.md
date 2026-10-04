# Anand Cycles error checklist audit

Reviewed against `cycle_website_errors_master_list.pdf`.

## Database and catalogue

- **Missing table / database connection failure:** public catalogue reads now fall back to the bundled 88-item catalogue when the optional MySQL database is unavailable, unreachable, or missing tables. Owner-created cycles and sessions use a safe in-memory preview fallback rather than returning a broken server error.
- **Database locked / transient database failures:** read/write operations catch database failures and continue through the preview fallback. A production deployment should still use the configured MySQL database and run `pnpm db:migrate`/`pnpm db:push` with `DATABASE_URL`.
- **Undefined `.map`:** public data is always normalized to an array; the live endpoint returned 88 products and all 88 had images.
- **Payload Too Large / 413:** JSON and form limits are now 10 MB, and oversized requests return structured HTTP 413 JSON explaining how to split the batch.
- **Schema safety:** `shop_cycles.sourcePage` was widened from 32 to 255 characters so official provenance metadata cannot be truncated.

## Google SSO

- **redirect_uri_mismatch:** the callback remains derived from the exact site origin and is documented in `.env.example` and `CATALOGUE-SOURCES.md`. The current preview callback is:

  `https://3001-ikijt4jod5qytgzdcajrj-d147e99b.sg2.manus.computer/api/shop/google/callback`

- **invalid_client:** credentials are trimmed before use and the live config reports both Google credentials as present. Google Cloud still remains the source of truth for whether the supplied credential is valid.
- **Expired sign-in state:** PKCE/state/nonce values have bounded lifetime, and successful sessions refresh their 30-day expiry when active.
- **access_denied:** the UI now explains that Testing-mode apps require the current Google account to be added as a test user.
- **Customer and owner entry routes:** both routes were live-tested; trusted page origins receive a Google 302 redirect, while missing/untrusted origins receive a safe 403.

## Roles and permissions

- Unauthenticated owner access stays on the owner sign-in screen.
- Customer sessions cannot edit owner listings.
- The owner page waits for session resolution before reading `role`, preventing null-role errors.
- `/admin-dashboard` now resolves to the protected owner panel as a compatibility alias, preventing the common legacy 404.
- Owner cycle creation still requires a valid image URL and remains protected by the owner session.

## Cloudflare and routing

- Live health endpoint verified: HTTP 200 `{"status":"ok"}`.
- Live product endpoint verified: HTTP 200, 88 products, zero missing images.
- Live `/admin-dashboard` verified: HTTP 200.
- HTTP 521/502/522 are origin/edge infrastructure failures rather than application code errors; the current origin is healthy and serving the checks above.
