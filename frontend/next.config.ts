import type { NextConfig } from "next";

/**
 * Next.js configuration
 * 
 * Security considerations:
 * - OWASP #7 - XSS: Content Security Policy headers configured
 * - Headers help prevent XSS attacks and other security issues
 */
const nextConfig: NextConfig = {
  // OWASP #7 - XSS: Add security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy
          // OWASP #7 - XSS: Restrict sources for scripts, styles, etc.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // 'unsafe-eval' needed for Next.js dev
              "style-src 'self' 'unsafe-inline'", // 'unsafe-inline' needed for Tailwind
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:8000 https://*", // API connections
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
