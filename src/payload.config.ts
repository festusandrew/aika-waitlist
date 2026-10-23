import path from 'path'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Posts } from './collections/Posts'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseURI = process.env.DATABASE_URI
const secret = process.env.PAYLOAD_SECRET

if (!databaseURI) {
  throw new Error(
    'DATABASE_URI is not set. Add a Postgres connection string to .env.local and the Vercel environment.',
  )
}

if (!secret) {
  throw new Error(
    'PAYLOAD_SECRET is not set. Add a long random value to .env.local and the Vercel environment.',
  )
}

// Falls back to local disk storage when BLOB_READ_WRITE_TOKEN is unset, which
// is convenient in development. Set the token in Vercel for durable uploads.
const storage = [
  vercelBlobStorage({
    collections: { media: true },
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }),
]

export default buildConfig({
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  secret,
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: databaseURI,
    },
    // Use committed migrations everywhere so development and production stay
    // on the same schema. Run `pnpm migrate` after configuring a fresh database.
    push: false,
    prodMigrations: migrations,
  }),
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { 'en': adminLanguage },
  },
  collections: [Admins, Media, Folders, Tags, Posts],
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  plugins: [mcpPlugin({})],
  storage,
})
