// The browser talks to /api on the same origin; Next forwards it to the Fastify server (keeps the session cookie first-party).
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
module.exports = {
  reactStrictMode: true,
  async rewrites() { return [{ source: '/api/:path*', destination: `${BACKEND}/:path*` }]; },
};
