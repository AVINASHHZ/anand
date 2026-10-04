# Anand Cycles — Rajapalayam

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.

## Anand Cycles owner Google access

Customer Google OAuth uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
For private owner Google OAuth, also set `ANAND_OWNER_GOOGLE_EMAIL` to the exact Google account email that is allowed to manage the catalogue. The owner page keeps the username/passkey login as a fallback when configured.

Google OAuth must allow this callback URL on the deployed origin:
`https://YOUR-DOMAIN/api/shop/google/callback`

The Rajapalayam store photo is referenced from the public Justdial listing for The Anand Cycle Stores. If the third-party image becomes unavailable, the page falls back to the existing Rajapalayam town image.
