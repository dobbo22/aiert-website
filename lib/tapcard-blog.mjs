// Single source of truth for TapCard blog posts — consumed by the blog pages,
// lib/tapcard-routes.mjs (sitemap + IndexNow). Plain JS so a bare `node` script can import it.
// Each post: body is a list of sections; a section has an optional heading `h` and paragraphs `p`.
// Only say what TapCard really does (see /how-it-works, /promote, /societies); keep claims in step with those pages.

export const BLOG_POSTS = [
  {
    slug: "send-an-offer-without-a-mailing-list",
    title: "How a restaurant can send a special offer without a mailing list",
    description:
      "Building an email list takes months. Here is how a restaurant, café or shop can post an offer from a phone and have it reach the people who follow its card.",
    date: "2026-10-30",
    body: [
      {
        p: [
          "Most small businesses know they should be telling customers about offers and news. Most of them don't, because the usual way to do it means collecting email addresses, choosing a newsletter tool and finding time to write something every week.",
          "There is a simpler way if your customers already have your card on their phone.",
        ],
      },
      {
        h: "Start with a card people can follow",
        p: [
          "Put your business card where customers look: on the door, at the till or on a table. They scan the QR code with their phone camera, and your details open in their browser with no app needed. One tap on Save Contact puts you in their phone.",
          "If they also have the free TapCard app, they can follow your card. That is the only step on their side, and they choose it themselves.",
        ],
      },
      {
        h: "Post an offer or news in under a minute",
        p: [
          "Open TapCard, tap Promote, write a line and set a staff PIN. An offer might be \"Free dessert with any main\", with a length of time and a limit on how many people can have it. News might be \"Fresh oysters in tonight\" or \"Closed Monday for a private party\".",
          "Everyone who follows your card gets a notification on their phone.",
        ],
      },
      {
        h: "Claiming and using it",
        p: [
          "Each person claims their own one-off QR code. Your staff scan it with a phone camera, or type the code on any till, enter the PIN, and it is marked as used. It can never be used twice.",
          "You can also run a stamp card, such as buy three, get one free, with the reward in your own words. Customers keep the card on their phone and your staff add a stamp with a scan and your PIN.",
        ],
      },
      {
        h: "You see what works, not who",
        p: [
          "You can see how many people claimed each offer, how many came in and used it, how many follow you and how often your card is viewed. You never see who anyone is.",
          "Customers choose to follow you and can switch it off at any time. They get at most two notifications a week from a business, so your messages are welcome rather than ignored.",
        ],
      },
      {
        h: "What it costs",
        p: [
          "TapCard is free to download and always free for your customers. TapCard Promote is free for the first 3 months, then £49.99 a year or £9.99 a month for one business card. If you have several locations, TapCard for Business is priced per location and includes Promote on every card.",
        ],
      },
    ],
    cta: { text: "Build your card in 30 seconds. Type your business name and watch it happen.", href: "/demo?utm_source=blog", label: "Try the demo" },
  },
  {
    slug: "keep-club-members-informed-without-a-group-chat",
    title: "How a club can keep members informed without a group chat",
    description:
      "Group chats get noisy and mailing lists take work. Here is how a club, society or charity can reach members' phones with one short line.",
    date: "2026-10-30",
    body: [
      {
        p: [
          "Every club has the same problem. The AGM has moved, rehearsal is cancelled, and half the members never saw the message because it was buried in a group chat or an email.",
        ],
      },
      {
        h: "People follow once",
        p: [
          "Members scan your group's QR code and save your card. If they have the free TapCard app they can follow it, and from then on every news item you post reaches their phone as a notification.",
          "People without the app can still see your card and its latest news on its page, so nobody is shut out.",
        ],
      },
      {
        h: "One line from your phone",
        p: [
          "Open TapCard, tap Promote and write a line, such as \"AGM moved to Thursday\" or \"Rehearsal cancelled tonight\". You can add a Read more link to the full story on your website or newsletter.",
        ],
      },
      {
        h: "Events, perks and stamp cards",
        p: [
          "Offer a first session free, early-bird tickets or a members' discount. Each person claims their own one-off code, and a steward checks it with a PIN. Or run a stamp card: attend six sessions and get the seventh free.",
        ],
      },
      {
        h: "Details that don't go out of date",
        p: [
          "Meeting times, the venue, who to contact and your social pages live on your card. Change one thing and everyone who saved it has the new version.",
          "Put the QR code on the hall door, the newsletter, the membership form and the programme.",
        ],
      },
      {
        h: "Private and tidy",
        p: [
          "You see how many people follow you, never who. Followers choose what they hear about and get at most two notifications a week from you.",
          "Posts are checked automatically: no abusive content, no gambling offers and no money-making scams. A raffle or fundraiser is fine. Anyone can report a card, offer or news item from its page.",
        ],
      },
      {
        h: "What it costs",
        p: [
          "Free for 3 months, then £49.99 a year or £9.99 a month for one card with TapCard Promote (news, events and stamp cards). Making and sharing the card is free, and people who follow you never pay.",
        ],
      },
    ],
    cta: { text: "Type your group's name on the demo and watch TapCard build a card from your website.", href: "/demo?utm_source=blog", label: "Try the demo" },
  },
];

export function getPost(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
