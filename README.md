# aika waitlist

Pre-launch landing page for aika, with an email waitlist backed by
[Brevo](https://www.brevo.com/). Built with Next.js 16 (App Router), React 19,
Tailwind CSS v4, and Payload CMS on Figma Cloud.

## Local development

```bash
pnpm install
pnpm dev
```

The dev server listens on `$PORT` (default `3000`).

Create a `.env.local` with the variables from `.env.example` to test real
waitlist submissions. Without Brevo credentials the API returns a friendly
`503` and the page still renders.

## Environment variables

| Variable             | Required | Description                                            |
| -------------------- | -------- | ------------------------------------------------------ |
| `BREVO_API_KEY`      | Yes      | Brevo API v3 key. Server-only.                         |
| `BREVO_LIST_ID`      | Yes      | Numeric ID of the Brevo list new signups are added to. |
| `BREVO_SENDER_EMAIL` | Yes      | Verified Brevo sender address for the welcome email.   |
| `NEXT_PUBLIC_SITE_URL` | No     | Public URL for canonical/OG metadata.                  |

`BREVO_API_KEY` is a secret. Never rename it to `NEXT_PUBLIC_*` and never commit
it. Add it through your hosting provider's environment variable settings.

## Deployment

### Vercel

1. Import the repository in Vercel.
2. Add `BREVO_API_KEY`, `BREVO_LIST_ID`, and `BREVO_SENDER_EMAIL` under
   **Project → Settings → Environment Variables** for Production and Preview.
3. Deploy. `vercel.json` runs `scripts/vercel-build.mjs`, which:
   - runs the normal `payload build` when Figma Cloud environment IDs are
     present; or
   - builds the public waitlist only when they are absent.

The Payload admin is hosted by Figma Cloud and needs platform-provisioned
values (`FIGMA_EID`, `FIGMA_CONTENT_API_CONTENT_SYSTEM_ID`, and related
credentials) to boot. Without them the build would fail with
`Environment ID could not be resolved`, so the Vercel build excludes the admin
route group for that deployment. The waitlist, thank-you flow, mini-game, and
API route work normally. `/admin` is not available on Vercel in that mode.

To include the CMS on Vercel, set the Figma Cloud environment variables in the
Vercel project; the build script automatically switches to the full build. The
supported hosting path for the CMS remains Figma Make (`pnpm run build`).

### Figma Make

```bash
.figma/make/deploy
```

This runs `pnpm run build` (`payload build`) and uploads through the Figma Make
adapter.

### Custom domain / metadata

Vercel automatically exposes `VERCEL_PROJECT_PRODUCTION_URL`, which the app uses
for `metadataBase` and Open Graph URLs. For a custom domain, set
`NEXT_PUBLIC_SITE_URL` to the canonical origin.

## Scripts

| Command              | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `pnpm dev`           | Start Next.js in development mode.        |
| `pnpm build`         | Payload + Next production build.          |
| `pnpm start`         | Serve the production build.               |
| `pnpm generate:types`| Regenerate `src/payload-types.ts`.        |
| `pnpm format`        | Format with oxfmt.                        |

## API

`POST /api/waitlist` accepts `{ "email": "you@example.com" }`:

- validates the address and request size;
- filters the hidden honeypot field;
- rate limits repeated submissions per instance;
- adds the contact to the Brevo list and sends a welcome email for new contacts;
- returns a structured `{ success, confirmationSent }` response.

## Content and admin

Payload collections (`Admins`, `Media`, `Folders`, `Tags`, `Posts`) live in
`src/collections/` and are registered in `src/payload.config.ts`. The public
waitlist does not read from Payload; it is an independent Brevo integration.
