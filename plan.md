# Anand Cycles — Implementation Plan

## Product scope

Build a polished, responsive Anand Cycles website for Rajapalayam. Catalogue the Hercules bikes shown in the user-supplied brochures, including the Hercules-specific Roadeo and Senior Roadsters sections plus the shared BSA/Hercules Junior Roadsters section under an explicit combined-brand label. Feature Hercules Roadeo Ravager SS. Give customers a clear enquiry-by-phone route and never publish catalogue or online prices. Include a real Rajapalayam town image, clearly presented as a place image rather than an Anand Cycles storefront photo, the shop address and the phone number Ashwin confirmed: **+91 72005 49950**. Provide distinct customer Google sign-in and owner username/passkey login. After a verified owner login, provide persistent add/delete controls for cycle listings.

## Approved visual direction: Workshop Ledger

- **Design movement:** contemporary workshop editorial, informed by cycle-service ledgers, stamped catalogue tabs and frame decals.
- **Core principles:** clear mechanical hierarchy; product-first composition; grounded local details; no decorative clutter.
- **Color philosophy:** deep green-black `#18332F` for trust and workshop precision; warm paper `#D9CDB7` and off-white surfaces for a printed-catalogue feel; ink black for legibility, with sparing safety-orange for important contact actions.
- **Layout paradigm:** left-aligned editorial flow with an offset split hero; product imagery and local photography alternate across wide horizontal bands rather than a generic centered grid.
- **Signature elements:** catalogue-index labels and rules; a cycle-wheel/ledger monogram; a small stamp-style “Price on enquiry” marker.
- **Interaction philosophy:** fast routes to the shop; prominent tap-to-call links; customer and owner journeys kept visibly distinct; owner actions update the persistent catalogue with immediate feedback.
- **Animation:** restrained 150–220 ms hover, focus and reveal transitions; respect reduced-motion preference; no autoplay or scroll-jacking.
- **Typography:** IBM Plex Sans, with firm display labels and calm, readable product text.
- **Brand essence:** Rajapalayam cycle buying with a real local shop behind the choice. Personality: capable, welcoming, straightforward.
- **Brand voice:** specific and plainspoken, with no inflated performance claims. Examples: “A closer look at the Roadeo Ravager SS.” “Call in for today’s price and a fit check.”
- **Wordmark & logo:** a compact original wheel/ledger symbol beside a custom-set ANAND / CYCLES lockup; the name remains real typography, not generated lettering.
- **Signature brand color:** deep workshop green `#18332F`.

## Catalogue selection and source notes

- The featured cycle is **Hercules Roadeo Ravager SS** (uploaded brochure PDF page 42 / printed page 83). The brochure gives frame height 18.5T; wheel sizes 27.5T/29T; sporty hardtail frame with IBR; bearing hub with front QR; double-wall alloy rim; dual disc brake; cotterless crank with alloy pedals; 2.4T nylon reflective tan-wall tyres; mechanical lock-in/lock-out suspension fork with CP finish; dual-colour switchback stickers; and transparent-grip handlebar. The hero emphasizes only a few legible verified specs.
- Seed 39 products with individual crops from the supplied PDF: 13 Hercules Roadeo listings, 16 from the **joint BSA/Hercules Junior Roadsters** section (shown as “BSA / Hercules · Junior Roadsters,” with a clear note that the source groups the makes), and 10 distinct Hercules Senior Roadsters listings. The senior segment includes Popular DTS, Popular DLX and Popular Singham DTT as separate brochure-labelled models. This broadens coverage without falsely attributing shared-range bikes to Hercules alone; reuse a Popular layout only when the brochure repeats the same model label.
- Junior Roadsters cards state that the brochure presents the range jointly and that customers should call to confirm exact make/variant availability. Product records include brochure-page/source references; no source PDFs or hidden list prices are copied to the public page.
- The genuine Rajapalayam town view was selected from image search and copied to project storage. Add a small photo credit and link to [Britannica’s Rajapalayam reference](https://www.britannica.com/place/Rajapalayam). The image depicts the town, not the shop.
- The public listing gives the shop address **No. 749, Opposite South Police Station, Tenkasi Road, Rajapalayam, Virudhunagar 626117, Tamil Nadu**. Source: [Justdial](https://www.justdial.com/Virudhunagar/The-Anand-Cycle-Stores-Opposite-South-Police-Station-Rajapalayam/9999P4562-4562-131224130218-R4G2_BZDET). The number is displayed from Ashwin’s direct confirmation in this conversation: **+91 72005 49950**.

## Application architecture and persistence

- React, Vite, Express, tRPC/Drizzle starter; server capability is enabled. Managed MySQL is enabled for persistent accounts, sessions and catalogue changes.
- SQLite is useful for a local prototype, but a file on a hosted container is not a reliable durable production store: restarts/redeploys and multiple instances may lose or diverge from file data. Managed MySQL is already enabled one-way for this project and is the appropriate durable store; do not switch the hosted site to SQLite.
- Public pages: `/` home/catalogue, `/login` customer Google sign-in, and `/owner` owner login/management. Keep `client/public/manus-routes.json` synchronized with these page routes.
- Persist product rows, verified Google customer identities, one-time catalogue seed state and hashes of opaque database-backed session tokens in MySQL. Do not store customer passwords. Owner login uses server-side credentials in protected environment values. Enforce owner authorization server-side for product creation and deletion. No price field exists in public rendering, stored catalogue model or owner add form.
- Use Google’s authorization-code flow with server-side code exchange, HTTPS callback, PKCE and a single-use, browser-bound CSRF state; request only `openid email profile`. Store Google OAuth credentials and the owner username/passkey through protected input, never source code. Use `HttpOnly` session cookies and `SameSite=None; Secure` for public HTTPS Preview/production, with a separate Lax/non-Secure path only for plain local HTTP.
- Validate add/delete API inputs. Seed the supplied brochure listings idempotently once; later owner edits and deletions must not be overwritten by restarts.

## Project structure

- `client/src/pages/` — home catalogue, customer login, and owner access/management.
- `client/src/components/` — brand lockup, shared navigation/footer, call CTA, product cards, filters and owner-only form.
- `client/src/index.css` — Workshop Ledger tokens, responsive composition, focus treatment and reduced-motion support.
- `server/_core/` — Express health and Google/owner/session/product endpoints and authorization helpers; retain starter platform authentication as separate infrastructure.
- `server/db.ts`, `drizzle/schema.ts`, `drizzle/` — customer, session, seed marker and cycle-product persistence with additive MySQL migrations.
- `client/public/manus-routes.json` — complete home/login/owner route manifest.
- Project storage — 37 brochure-page bicycle crops, Rajapalayam place photograph and brand symbol.
- `plan.md`, `TODO.md` — current scope and outcome criteria.
- Project storage — 39 brochure-page bicycle crops, Rajapalayam place photograph and brand symbol.
