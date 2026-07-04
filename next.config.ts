/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any d3 packages that Webpack complains about here:
  transpilePackages: ['d3', 'd3-interpolate', 'd3-color', 'd3-shape'],
  
};

module.exports = nextConfig;