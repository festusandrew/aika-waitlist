import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

// Prefer an explicit public URL, then Vercel's deployment URL, then local.
const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
const siteURL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Don't block publishing or preview deploys on errors if the emitted JS is valid.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prerender source maps add ~100 MB per static build worker.
  enablePrerenderSourceMaps: false,
  experimental: {
    // Adopt the Next.js security upgrade policy for this app.
    agentUpgrade: 'security',
    // Caps static build workers (~250-380 MB each) to lower `next build` peak memory.
    cpus: 2,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  env: {
    NEXT_PUBLIC_SITE_URL: siteURL,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
