// "Open the company's own app" links: tapcard.aiert.co.uk/open/<slug> sends an iPhone or iPad to the company's App Store page (which shows
// Open when the app is installed), an Android phone to its Google Play page, and anything else to the company's website. One address on a
// card therefore works on every phone. The slug list is fixed here (an open redirect would be abused), so adding a company means adding a line.
// If a company supplies a link that opens its app directly (a universal link), put it in `ios` / `android` instead.
export interface OpenApp { name: string; ios: string; android: string; web: string }

export const OPEN_APPS: Record<string, OpenApp> = {
  // Chelsea Official App (publisher Chelsea Football Club): match tickets are kept inside it, so TapCard only opens it and never sees a ticket.
  chelsea: {
    name: "Chelsea Official App",
    ios: "https://apps.apple.com/gb/app/chelsea-official-app/id1353142218",
    android: "https://play.google.com/store/apps/details?id=com.chelseafc.the5thstand",
    web: "https://www.chelseafc.com/en",
  },
};

export function openAppDestination(slug: string, userAgent: string): string | null {
  const app = OPEN_APPS[slug.toLowerCase()];
  if (!app) return null;
  if (/android/i.test(userAgent)) return app.android;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return app.ios;
  return app.web;
}
