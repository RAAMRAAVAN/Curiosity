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
};

export default nextConfig;
