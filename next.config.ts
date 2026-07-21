import type { NextConfig } from "next";

const AIERT_HOST = "(www\\.)?aiert\\.co\\.uk";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old B2B webapp pages on aiert.co.uk -> business.mailbroom.app
      // (checked before the general /mailbroom rule below, and query
      // strings — including the ?ref= attribution token — are preserved
      // automatically by Next.js)
      {
        source: "/mailbroom/webapp/:path*",
        has: [{ type: "host", value: AIERT_HOST }],
        destination: "https://business.mailbroom.app/:path*",
        permanent: true,
      },
      // Everything else under /mailbroom (iOS/Apple app content) -> ios.mailbroom.app
      {
        source: "/mailbroom/:path*",
        has: [{ type: "host", value: AIERT_HOST }],
        destination: "https://ios.mailbroom.app/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // business.mailbroom.app transparently serves the existing
        // app/mailbroom/webapp/* page tree
        {
          source: "/:path*",
          has: [{ type: "host", value: "business.mailbroom.app" }],
          destination: "/mailbroom/webapp/:path*",
        },
        // ios.mailbroom.app transparently serves the existing
        // app/mailbroom/* page tree (excluding /webapp, which is
        // claimed by business.mailbroom.app above and never reached
        // here since that host won't match this rule)
        {
          source: "/:path*",
          has: [{ type: "host", value: "ios.mailbroom.app" }],
          destination: "/mailbroom/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
