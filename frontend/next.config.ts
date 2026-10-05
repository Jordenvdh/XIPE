import type { NextConfig } from "next";

/**
 * Next.js configuration
 * 
 * Security considerations:
 * - OWASP #7 - XSS: Content Security Policy headers configured
 * - Headers help prevent XSS attacks and other security issues
 */
const isDev = process.env.NODE_ENV === 'development';

// Origins the browser may call: own origin, Nominatim city search, and the
// configured API (or the local backend during development)
const connectSources = [
  "'self'",
  'https://nominatim.openstreetmap.org',
  process.env.NEXT_PUBLIC_API_URL,
  isDev ? 'http://localhost:8000' : undefined,
].filter(Boolean);

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' is only needed by the Next.js dev server; 'unsafe-inline' is
  // needed for the inline scripts Next.js emits for hydration
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'", // 'unsafe-inline' needed for Tailwind
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSources.join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          // Content Security Policy
          // OWASP #7 - XSS: Restrict sources for scripts, styles, etc.
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
