# aika waitlist

Pre-launch landing page for aika, with an email waitlist backed by
[Brevo](https://www.brevo.com/). Built with Next.js 16 (App Router), React 19,
Tailwind CSS v4, and a self-hosted Payload CMS using Postgres and Vercel Blob.

The public waitlist is independent of Payload: it does not query the CMS, so it
keeps working even before the database is connected. Payload is available at
`/admin` for managing the starter collections (`Posts`, `Media`, `Folders`,
`Tags`, and `Admins`).

## Local development

```bash
pnpm install
pnpm dev
```

The dev server listens on <http://localhost:3000>.

Copy `.env.example` to `.env.local` and fill in the values. Without Brevo
credentials the waitlist API returns a friendly `503` and the page still renders.
Without `DATABASE_URI` and `PAYLOAD_SECRET`, the public site still runs but
`/admin` is unavailable.

To use the CMS locally:

1. Create a Postgres database (Neon, Supabase, Vercel Postgres, or a local
   server).
2. Put its connection string in `DATABASE_URI`.
3. Generate a secret with `openssl rand -hex 32` and put it in `PAYLOAD_SECRET`.
4. Apply the committed migrations once:

   ```bash
   pnpm migrate
   ```

5. Run `pnpm dev` and open <http://localhost:3000/admin>. The first visit lets
   you create the first admin account with email/password.

Development and production use the same committed migrations, so a schema
change is made once and applied consistently:

```bash
pnpm migrate:create
pnpm migrate
```

Commit the new files under `src/migrations/`. Production applies pending
migrations automatically at startup through `prodMigrations`.

## Environment variables

| Variable                | Required for          | Description                                                        |
| ----------------------- | --------------------- | ------------------------------------------------------------------ |
| `BREVO_API_KEY`         | Waitlist              | Brevo API v3 key. Server-only.                                     |
| `BREVO_LIST_ID`         | Waitlist              | Numeric ID of the Brevo list new signups are added to.             |
| `BREVO_SENDER_EMAIL`    | Waitlist              | Verified Brevo sender address for the welcome email.               |
| `DATABASE_URI`          | Payload admin         | Postgres connection string. Use a pooled URL on Vercel.            |
| `PAYLOAD_SECRET`        | Payload admin         | Long random string used to sign admin sessions.                    |
| `BLOB_READ_WRITE_TOKEN` | Media uploads         | Vercel Blob read/write token. Local development can omit it.       |
| `NEXT_PUBLIC_SITE_URL`  | No                    | Canonical public URL for metadata. Vercel supplies a default.      |

`BREVO_API_KEY`, `DATABASE_URI`, `PAYLOAD_SECRET`, and
`BLOB_READ_WRITE_TOKEN` are secrets. Keep them out of `NEXT_PUBLIC_*`
variables, never commit `.env.local`, and add them through Vercel's environment
variable settings.

## Deployment

### Vercel

1. Import the repository in Vercel.
2. Add the Brevo variables under **Project → Settings → Environment
   Variables** for Production and Preview.
3. Add `DATABASE_URI` and `PAYLOAD_SECRET` to enable the CMS.
4. Add `BLOB_READ_WRITE_TOKEN` if you want durable media uploads.
5. Deploy. `vercel.json` runs `scripts/vercel-build.mjs`, which:
   - runs the full `payload build` when `DATABASE_URI` and `PAYLOAD_SECRET`
     are present; or
   - builds the public waitlist only when either value is missing.

In frontend-only mode the `/admin` and Payload API routes are excluded and the
public site works normally. Add the two Payload variables and redeploy to enable
`/admin`. Pending migrations are applied automatically on the first production
request.

The waitlist API and the mini-game do not depend on Payload or the database.

### Custom domain / metadata

Vercel automatically exposes `VERCEL_PROJECT_PRODUCTION_URL`, which the app uses
for `metadataBase` and Open Graph URLs. For a custom domain, set
`NEXT_PUBLIC_SITE_URL` to the canonical origin.

## Scripts

| Command                 | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `pnpm dev`              | Start Next.js in development mode.                 |
| `pnpm build`            | Payload + Next production build.                   |
| `pnpm start`            | Serve the production build.                        |
| `pnpm generate:types`   | Regenerate `src/payload-types.ts`.                 |
| `pnpm generate:importmap` | Regenerate the Payload admin import map.         |
| `pnpm migrate:create`   | Create a Postgres migration.                       |
| `pnpm migrate`          | Apply pending Postgres migrations.                 |
| `pnpm format`           | Format with oxfmt.                                 |

`pnpm build` loads the Payload config, so it needs `DATABASE_URI` and
`PAYLOAD_SECRET`. The Vercel entrypoint handles the unconfigured case.

## API

`POST /api/waitlist` accepts `{ "email": "you@example.com" }`:

- validates the address and request size;
- filters the hidden honeypot field;
- rate limits repeated submissions per instance;
- adds the contact to the Brevo list and sends a welcome email for new contacts;
- returns a structured `{ success, confirmationSent }` response.

## Content and admin

Payload collections live in `src/collections/` and are registered in
`src/payload.config.ts`. The admin uses Payload email/password authentication;
the first admin is created from `/admin` while the `Admins` collection is empty.
Additional admins can be created by an authenticated admin.

Media uploads use Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set and fall back
to local disk during development. Vercel's filesystem is ephemeral, so set the
token for persistent uploads in production.
