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
          "Put your business card where customers look: on the door, at the till or on a table. They scan the QR code with their phone camera, and your details open in their browser, so anyone can view and save your card without installing anything. One tap on Save Contact puts you in their phone.",
          "To follow your card and receive your offers and news, they use the TapCard app, which costs customers nothing. That is the only step on their side, and they choose it themselves.",
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
          "Customers never pay to follow your card or claim an offer. TapCard Promote is free for the first 3 months, then £49.99 a year or £9.99 a month for one business card. If you have several locations, TapCard for Business is priced per location and includes Promote on every card.",
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
          "Members scan your group's QR code and save your card. If they use the TapCard app they can follow it, and from then on every news item you post reaches their phone as a notification.",
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
  {
    slug: "what-tapcard-can-do-for-a-local-business",
    title: "What TapCard can do for a local business",
    description:
      "Grow a following of people who want to hear from you, then reach their phones with an offer or a piece of news in under a minute. How a café, restaurant or shop can use TapCard.",
    date: "2026-11-09",
    body: [
      {
        p: [
          "A business card gets handed over once and then sits in a drawer. TapCard turns it into something that keeps working: a card on your customers' phones that you can use to tell them about an offer or some news whenever you like.",
          "It comes down to two jobs. First, build up a group of people who follow your card. Then, give them a reason to come in.",
        ],
      },
      {
        h: "Job one: grow your followers",
        p: [
          "Every offer and every piece of news you post goes to the people who follow your card, so the first job is getting more of them. Your card has a QR code, and the best place for it is wherever customers already are: on the door, at the till, on the tables, on the menu or on the receipt.",
          "TapCard can make a QR sign for you with the headline \"Scan to follow and receive news and offers\", which you can email to yourself and print. A line from staff at the till helps too: \"Scan this and you'll hear about our offers first.\"",
          "Anyone who scans the code sees your card in their browser and can save you with one tap, without installing anything. To follow your card and get your offers and news as notifications, they use the TapCard app, which costs customers nothing. When someone saves your card in the app, TapCard asks whether they would like your offers and news, so they choose it themselves.",
          "You can also put your card's link wherever your customers already find you: your website, your Instagram bio, your email signature or a message to regulars.",
        ],
      },
      {
        h: "Why followers are worth having",
        p: [
          "Your messages go straight to their phones, not through a social media feed where a post might be shown to a fraction of your followers or none of them. People who follow you have asked to hear from you, and they get at most two notifications a week from any one business, so what you send is welcome rather than ignored.",
        ],
      },
      {
        h: "Job two: post an offer",
        p: [
          "Open TapCard, tap Promote, write a line and set a staff PIN. Choose how long the offer lasts and how many people can have it. Everyone who follows your card gets a notification straight away.",
          "A few things that tend to work: make the offer specific (\"Free dessert with any main\" beats \"Great deals this week\"), give it a deadline, and use it on the days you most want more people through the door. A quiet Tuesday is a better time for an offer than a busy Saturday.",
          "Each person claims their own one-off QR code. Your staff scan it with a phone camera, or type the code on any till, enter the PIN, and it is marked as used. It can never be used twice, so there are no codes to hand out and nothing to print.",
        ],
      },
      {
        h: "Post some news",
        p: [
          "Not everything is an offer. A short line of news (up to 140 characters) keeps people in touch with you: \"Fresh oysters in tonight\", \"Closed Monday for a private party\", \"New autumn menu starts Thursday\". If you change your menu, opening hours or details, every saved copy of your card updates itself as well.",
        ],
      },
      {
        h: "Bring people back with a stamp card",
        p: [
          "You can also run a stamp card, such as buy three, get one free, with the reward in your own words. Customers keep the card on their phone, your staff add a stamp with a scan and your PIN, and the card starts again when the reward is given. There is no paper card to lose.",
        ],
      },
      {
        h: "See what is working",
        p: [
          "You can see how many people follow you, how often your card is viewed, how many claimed each offer and how many came in and used it. You see numbers, not names: you never see who anyone is. That makes it easy to tell which offers bring people in and which don't.",
        ],
      },
      {
        h: "More than one location",
        p: [
          "If you run several places, each location can have its own card, and the staff who run each one can post for their own shop. TapCard for Business is priced per location and includes Promote on every card.",
        ],
      },
      {
        h: "What it costs",
        p: [
          "Making and sharing your card is free, and customers never pay to follow it or claim an offer. TapCard Promote, which is what lets you post offers, news and stamp cards, is free for the first 3 months, then £49.99 a year or £9.99 a month for one business card.",
        ],
      },
    ],
    cta: { text: "Type your business name and watch TapCard build your card from your website.", href: "/demo?utm_source=blog", label: "Try the demo" },
  },
];

export function getPost(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
