// Central site configuration for metadata, sitemap, and robots (roadmap step 23).
// The production URL defaults to the Vercel-generated domain and can be
// overridden with NEXT_PUBLIC_SITE_URL once a custom domain is configured.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weeding-planner.vercel.app'

export const SITE_NAME = 'My Weeding Seats'
