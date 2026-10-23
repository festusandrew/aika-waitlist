import type { Access, CollectionConfig } from 'payload'

const isPayloadAdmin: Access = ({ req }) => req.user?.collection === 'admins'

// Self-hosted Payload uses email/password auth. Allow the first admin to be
// created from /admin, then restrict further creation to authenticated admins.
const canCreateAdmin: Access = async ({ req }) => {
  if (req.user?.collection === 'admins') return true

  const { totalDocs } = await req.payload.count({
    collection: 'admins',
    overrideAccess: true,
  })

  return totalDocs === 0
}

export const Admins: CollectionConfig = {
  slug: 'admins',
  access: {
    create: canCreateAdmin,
    delete: isPayloadAdmin,
    read: isPayloadAdmin,
    update: isPayloadAdmin,
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
