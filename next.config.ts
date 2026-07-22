import type { NextConfig } from "next";

const AIERT_HOST = "(www\\.)?aiert\\.co\\.uk";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The pages themselves still have internal nav/footer/CTA links
      // hardcoded to the pre-split "/mailbroom/webapp/..." and
      // "/mailbroom/..." paths (baked in from when this was all one site
      // on aiert.co.uk). On the new subdomains those paths don't exist at
      // the file-tree root, so clicking them would double up through the
      // rewrites below and 404. Canonicalize back to the short form here
      // rather than editing every link across every page.
      {
        source: "/mailbroom/webapp/:path*",
        has: [{ type: "host", value: "business.mailbroom.app" }],
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/mailbroom/:path*",
        has: [{ type: "host", value: "ios.mailbroom.app" }],
        destination: "/:path*",
        permanent: true,
      },
      // The company leaderboard is Business content (queries opted-in
      // organizations, links to app.mailbroom.app/billing) that was
      // misplaced in the iOS file tree during the original split — it
      // briefly lived at ios.mailbroom.app/leaderboard; redirect that to
      // its correct home.
      {
        source: "/leaderboard",
        has: [{ type: "host", value: "ios.mailbroom.app" }],
        destination: "https://business.mailbroom.app/leaderboard",
        permanent: true,
      },
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
      // The company leaderboard, same as above — was under /mailbroom/
      // on aiert.co.uk pre-split, but belongs on business.mailbroom.app,
      // not ios.mailbroom.app like the rest of /mailbroom/* below.
      {
        source: "/mailbroom/leaderboard",
        has: [{ type: "host", value: AIERT_HOST }],
        destination: "https://business.mailbroom.app/leaderboard",
        permanent: true,
      },
      // Everything else under /mailbroom (iOS/Apple app content) -> ios.mailbroom.app
      {
        source: "/mailbroom/:path*",
        has: [{ type: "host", value: AIERT_HOST }],
        destination: "https://ios.mailbroom.app/:path*",
        permanent: true,
      },
      // The blog (previously aiert.co.uk/blog) moved to ios.mailbroom.app —
      // its one existing post is about the iOS app specifically, not a
      // generic AIERT topic, so it belongs alongside the product it covers.
      {
        source: "/blog/:path*",
        has: [{ type: "host", value: AIERT_HOST }],
        destination: "https://ios.mailbroom.app/blog/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // business.mailbroom.app transparently serves the existing
        // app/mailbroom/webapp/* page tree. sitemap.xml/robots.txt are
        // excluded so each subdomain's own metadata routes (which are
        // host-aware, see app/sitemap.ts) are served instead, and _next/*
        // is excluded so the page's own CSS/JS assets keep loading —
        // beforeFiles rewrites are checked before _next/static, so without
        // this exclusion every asset request gets mangled into a
        // non-existent /mailbroom/webapp/_next/... path and 404s, which
        // is why the pages first went live completely unstyled.
        // mailbroom-icon.png (public/) is excluded for the same reason —
        // beforeFiles also runs before /public files are served.
        {
          source: "/:path((?!_next/|sitemap\\.xml|robots\\.txt|llms\\.txt|mailbroom-icon\\.png).*)",
          has: [{ type: "host", value: "business.mailbroom.app" }],
          destination: "/mailbroom/webapp/:path*",
        },
        // ios.mailbroom.app transparently serves the existing
        // app/mailbroom/* page tree (excluding /webapp, which is
        // claimed by business.mailbroom.app above and never reached
        // here since that host won't match this rule)
        {
          source: "/:path((?!_next/|sitemap\\.xml|robots\\.txt|llms\\.txt|mailbroom-icon\\.png).*)",
          has: [{ type: "host", value: "ios.mailbroom.app" }],
          destination: "/mailbroom/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
