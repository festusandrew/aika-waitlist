import { execSync } from 'node:child_process'
import { existsSync, renameSync } from 'node:fs'
import path from 'node:path'

/**
 * Vercel build entrypoint.
 *
 * Payload needs DATABASE_URI and PAYLOAD_SECRET. When they are absent we build
 * the public waitlist only, so a preview deployment still works before the CMS
 * has been connected. When they are present we run the regular `payload build`.
 *
 * The Payload route group is moved outside `src/app` only for the duration of
 * the frontend-only build, then restored.
 */

const projectRoot = process.cwd()
const payloadRoutes = path.join(projectRoot, 'src', 'app', '(payload)')
// Park at the project root so the rename stays on one filesystem (no EXDEV).
const parkedRoutes = path.join(projectRoot, '.payload-routes-disabled')

const hasPayloadBackend = Boolean(
  process.env.DATABASE_URI && process.env.PAYLOAD_SECRET,
)

function run(command) {
  const env = {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-deprecation']
      .filter(Boolean)
      .join(' '),
  }

  // The OpenCode agent shell injects this to surface Next.js upgrade nudges.
  // It is not present on Vercel, and leaving it unset keeps local builds
  // reproducible instead of stopping on the advisory prompt.
  delete env.__NEXT_AGENT_UPGRADE

  execSync(command, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  })
}

if (hasPayloadBackend) {
  // Full build: generates the import map and Payload types, then Next.
  run('pnpm run build')
} else {
  console.log(
    '[vercel-build] DATABASE_URI/PAYLOAD_SECRET not configured; building the public site without /admin.',
  )

  // Recover routes left parked by an interrupted build.
  if (!existsSync(payloadRoutes) && existsSync(parkedRoutes)) {
    renameSync(parkedRoutes, payloadRoutes)
  }

  let parked = false
  try {
    if (existsSync(payloadRoutes)) {
      renameSync(payloadRoutes, parkedRoutes)
      parked = true
    }
    run('pnpm exec next build')
  } finally {
    if (parked) {
      renameSync(parkedRoutes, payloadRoutes)
    }
  }
}
