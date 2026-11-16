/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      { key: 'Permissions-Policy', value: 'geolocation=(), camera=(self), microphone=(self)' },
    ] }];
  },
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
