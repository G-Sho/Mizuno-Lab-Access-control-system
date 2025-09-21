import { InjectManifest } from 'workbox-webpack-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.plugins.push(
        new InjectManifest({
          swSrc: './public/sw.js',
          swDest: '../out/sw.js',
          exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
          maximumFileSizeToCacheInBytes: 5000000,
        })
      );
    }
    return config;
  },
}

export default nextConfig