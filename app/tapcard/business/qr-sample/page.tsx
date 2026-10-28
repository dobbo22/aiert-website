export const metadata = { title: "Sample QR sign — TapCard for Business", robots: { index: false, follow: false } };

// Where the QR code on a SAMPLE sign leads (a shop whose card has not been made yet), so a printed or scanned sample explains itself.
export default function QrSamplePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-black text-cloud">This is a sample sign</h1>
        <p className="mt-3 text-cloud">
          The shop&apos;s TapCard hasn&apos;t been made yet, so this QR code isn&apos;t its real one. Once the shop&apos;s manager has made the card in the
          TapCard app, the sign in the admin shows the real QR code, and scanning that saves the shop&apos;s card.
        </p>
      </div>
    </main>
  );
}
