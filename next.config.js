/** @type {import('next').NextConfig} */
process.env.NEXT_TELEMETRY_DISABLED = '1';

const nextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  staticPageGenerationTimeout: 1000,
  // Exclude server-only packages from client bundle (prevents Vercel build failures)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Native modules that should not be bundled by webpack on Vercel
      config.externals = [
        ...(config.externals || []),
        'kokoro-js',
        'canvas',
        'sharp',
      ];
    }
    // Prevent client-side bundling of server-only node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        child_process: false,
      };
    }
    return config;
  },
  // Increase serverless function memory/duration for TTS
  serverExternalPackages: ['msedge-tts', 'kokoro-js'],
};

module.exports = nextConfig;
