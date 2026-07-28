import type { NextConfig } from "next";

const AIERT_HOST = "(www\\.)?aiert\\.co\\.uk";
// Anchored exactly — "app.mailbroom.app" and "ios.mailbroom.app" both
// contain "mailbroom.app" as a substring, and all three domains live on
// this same Vercel project, so an unanchored match here would wrongly
// swallow those hosts too.
const MAILBROOM_APEX_HOST = "^mailbroom\\.app$";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // business.mailbroom.app is retired as a content host — mailbroom.app
      // is now canonical (see rewrites below) so every prior link/bookmark/
      // backlink to business.mailbroom.app just 301s straight across,
      // consolidating SEO signal onto the apex domain rather than splitting
      // it across two live hosts. Must come before any other rule so
      // nothing else tries to rewrite this host first.
      {
        source: "/:path*",
        has: [{ type: "host", value: "business.mailbroom.app" }],
        destination: "https://mailbroom.app/:path*",
        permanent: true,
      },
      // Business content wrongly reachable on the iOS host: the ios
      // rewrite below maps any path to /mailbroom/:path*, which doesn't
      // exclude /webapp (unlike mailbroom.app's rewrite, which explicitly
      // owns that tree). That let business content get duplicated at
      // ios.mailbroom.app/webapp/*, and double-prefixed paths like
      // /mailbroom/webapp/* (stale pre-split URLs) resolve to a
      // non-existent route. Canonicalize both back to mailbroom.app.
      // Must come before the generic "/mailbroom/:path*" rule below —
      // Next.js redirects are first-match-wins, and that broader rule
      // would otherwise catch /mailbroom/webapp/* first and bounce it to
      // /webapp/* on this same host before the rule below ever saw it,
      // turning a one-hop redirect into two.
      {
        source: "/mailbroom/webapp/:path*",
        has: [{ type: "host", value: "ios.mailbroom.app" }],
        destination: "https://mailbroom.app/:path*",
        permanent: true,
      },
      {
        source: "/webapp/:path*",
        has: [{ type: "host", value: "ios.mailbroom.app" }],
        destination: "https://mailbroom.app/:path*",
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
        destination: "https://mailbroom.app/leaderboard",
        permanent: true,
      },
      // Old B2B webapp pages on aiert.co.uk -> mailbroom.app
      // (checked before the general /mailbroom rule below, and query
      // strings — including the ?ref= attribution token — are preserved
      // automatically by Next.js)
      {
        source: "/mailbroom/webapp/:path*",
        has: [{ type: "host", value: AIERT_HOST }],
        destination: "https://mailbroom.app/:path*",
        permanent: true,
      },
      // The company leaderboard, same as above — was under /mailbroom/
      // on aiert.co.uk pre-split, but belongs on mailbroom.app, not
      // ios.mailbroom.app like the rest of /mailbroom/* below.
      {
        source: "/mailbroom/leaderboard",
        has: [{ type: "host", value: AIERT_HOST }],
        destination: "https://mailbroom.app/leaderboard",
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
        // mailbroom.app transparently serves the existing
        // app/mailbroom/webapp/* page tree. sitemap.xml/robots.txt are
        // excluded so each subdomain's own metadata routes (which are
        // host-aware, see app/sitemap.ts) are served instead, and _next/*
        // is excluded so the page's own CSS/JS assets keep loading —
        // beforeFiles rewrites are checked before _next/static, so without
        // this exclusion every asset request gets mangled into a
        // non-existent /mailbroom/webapp/_next/... path and 404s, which
        // is why the pages first went live completely unstyled.
        // mailbroom-icon.png (public/) is excluded for the same reason —
        // beforeFiles also runs before /public files are served. The
        // IndexNow key file is excluded too — Bing's verification fetch
        // expects it at the literal root path exactly as generated in
        // Bing Webmaster Tools, not rewritten under /mailbroom/webapp/.
        {
          source: "/:path((?!_next/|sitemap\\.xml|robots\\.txt|llms\\.txt|mailbroom-icon\\.png|09d90e3ec75e4e3c93a57c014df8764a\\.txt).*)",
          has: [{ type: "host", value: MAILBROOM_APEX_HOST }],
          destination: "/mailbroom/webapp/:path*",
        },
        // ios.mailbroom.app transparently serves the existing
        // app/mailbroom/* page tree (excluding /webapp, which is
        // claimed by mailbroom.app above and never reached here since
        // that host won't match this rule). Same IndexNow key file as
        // mailbroom.app — one key can be reused across multiple hosts
        // as long as it's hosted at each host's own root, so it's the
        // same physical public/ file, just excluded from this rewrite
        // too rather than a second key file.
        {
          source: "/:path((?!_next/|sitemap\\.xml|robots\\.txt|llms\\.txt|mailbroom-icon\\.png|09d90e3ec75e4e3c93a57c014df8764a\\.txt).*)",
          has: [{ type: "host", value: "ios.mailbroom.app" }],
          destination: "/mailbroom/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
