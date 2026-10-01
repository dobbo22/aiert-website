// Shared look for the Android waitlist pages (/w/<token> from an invite
// email, /android-waitlist for everyone else).
export default function WaitlistCard({
  heading,
  done,
  action,
  askEmail,
  knownEmail,
  error,
}: {
  heading: string;
  done: boolean;
  action: string;
  askEmail: boolean;
  knownEmail?: string;
  error?: boolean;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-center text-white ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="TapCard" className="mx-auto h-16 w-16 rounded-2xl" />
        {done ? (
          <>
            <h1 className="mt-5 text-xl font-bold">You&apos;re on the list</h1>
            <p className="mt-3 text-white/80">
              Martin will let you know the moment TapCard is on Google Play. Always be prepared!
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-xl font-bold">{heading}</h1>
            <p className="mt-3 text-white/80">
              TapCard for Android is with Google Play for review. Leave it with us and you&apos;ll hear the moment
              it&apos;s ready.
            </p>
            <form method="post" action={action}>
              {askEmail ? (
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Your email address"
                  className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder:text-white/50 ring-1 ring-white/20"
                />
              ) : (
                knownEmail && <p className="mt-4 text-sm text-white/60">We&apos;ll email {knownEmail}.</p>
              )}
              {error && <p className="mt-3 text-sm text-red-300">That email address doesn&apos;t look right.</p>}
              <button type="submit" className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318]">
                Yes, tell me when it&apos;s ready
              </button>
            </form>
            <p className="mt-4 text-xs text-white/50">
              We only use this to tell you about TapCard on Android. <a href="/privacy" className="underline">Privacy</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
