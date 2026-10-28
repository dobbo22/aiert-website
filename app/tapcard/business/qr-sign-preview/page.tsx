import QrSignEditor from "../admin/qr-sign/QrSignEditor";

export const metadata = { title: "QR sign preview — TapCard for Business", robots: { index: false, follow: false } };

// A sample of the QR sign with made-up shops, so the layout can be seen and tested without signing in. Nothing is saved from here.
export default function QrSignPreviewPage() {
  const sign = { headline: "Scan to follow and receive news and offers", line: "", footer: "Free TapCard app for iPhone and Android", showLogo: true, showSocials: false, showApp: true };
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-sm text-gold">Sample preview with example shops. Sign in to your admin to make your own.</p>
        <QrSignEditor
          selected="a"
          shops={[
            { id: "a", name: "The Rose Garden", town: "Great Dunmow", address: "16A High St, Great Dunmow", cardUrl: "https://tapcard.aiert.co.uk/c/example-made-card", sign },
            { id: "b", name: "The Rose Garden", town: "Great Bardfield", address: "Blake End, Great Bardfield", cardUrl: null, sign },
          ]}
          company={{ name: "The Rose Garden", website: "https://www.therosegardenflorists.co.uk", logoUrl: "https://www.aiert.co.uk/tapcard-icon.png", socials: [["Instagram", "https://www.instagram.com/rosegardenflorists"], ["Facebook", "https://www.facebook.com/Therosegardenflorists"]] }}
        />
      </div>
    </main>
  );
}
