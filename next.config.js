// Ensure Next router is patched against React error #310 (https://github.com/vercel/next.js/issues/63121)
require('./scripts/patch-next-router.cjs');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const routerPatchPath = require.resolve('./scripts/patch-next-router.cjs');
const routerPatchVersion = createHash('sha256').update(readFileSync(routerPatchPath)).digest('hex');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  webpack(config) {
    // Webpack treats node_modules as immutable. A restored Vercel cache can
    // therefore contain the original router even after the patch runs.
    if (config.cache && typeof config.cache === 'object') {
      config.cache.version = `${config.cache.version || ''}:gossaem-router:${routerPatchVersion}`;
      config.cache.buildDependencies = {
        ...config.cache.buildDependencies,
        gossaemRouterPatch: [routerPatchPath],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'nwuanuqblzzikhrpwzwd.supabase.co', pathname: '/storage/v1/object/public/teacher-portraits/**' },
      { protocol: 'https', hostname: 'api.bkend.ai' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

module.exports = (phase) => {
  if (phase === require('next/constants').PHASE_PRODUCTION_BUILD) {
    const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
      .filter((name) => !process.env[name]?.trim());
    if (missing.length) {
      throw new Error(`Missing build environment variables: ${missing.join(', ')}. Set them in Vercel Project Settings > Environment Variables for the target environment, then redeploy.`);
    }
  }
  return nextConfig;
};
