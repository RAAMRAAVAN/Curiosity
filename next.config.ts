/** @type {import('next').NextConfig} */
const nextConfig = {
  // For static export (static hosting like Netlify, Vercel, GitHub Pages)
  // output: 'export',
  
  images: {
    unoptimized: true, // disable Image Optimization for static export
  },
  
  // Ensure trailing slashes for proper routing with static exports
  trailingSlash: true,
  
  // Generate static pages
  staticPageGenerationTimeout: 120,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
