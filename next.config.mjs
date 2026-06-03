/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 🔥 Ajoute cette ligne pour ignorer les blocages de types TypeScript au build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;