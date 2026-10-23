import { execSync } from 'node:child_process'
import { existsSync, renameSync } from 'node:fs'
import path from 'node:path'

/**
 * Vercel build entrypoint.
 *
 * This project's Payload admin is hosted by Figma Cloud (`@payloadcms/figma`)
 * and its config refuses to boot without Figma-provisioned environment IDs.
 * The public waitlist does not use Payload, so when those variables are absent
 * we build the frontend only. When they are present, we run the regular
 * `payload build` so the admin is included.
 *
 * The Payload route group is moved outside `src/app` only for the duration of
 * the build. The repository and the Figma Make deploy path are untouched.
 */

const projectRoot = process.cwd()
const payloadRoutes = path.join(projectRoot, 'src', 'app', '(payload)')
// Park at the project root so the rename stays on one filesystem (no EXDEV).
const parkedRoutes = path.join(projectRoot, '.payload-routes-disabled')

const hasFigmaBackend = Boolean(
  process.env.FIGMA_EID ||
    process.env.FIGMA_CONTENT_API_CONTENT_SYSTEM_ID ||
    process.env.FIGMA_PROJECT_ID,
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

if (hasFigmaBackend) {
  // Full build: generates the import map and Payload types, then Next.
  run('pnpm run build')
} else {
  console.log(
    '[vercel-build] Figma Cloud env not configured; building the public site without Payload admin.',
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
