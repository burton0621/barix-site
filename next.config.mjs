/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid 307 redirects on API routes (e.g. Stripe webhooks). Use exact URL without trailing slash.
  trailingSlash: false,
}

export default nextConfig
