// Throwaway test page for the Android "save contact via intent://" experiment.
// Not linked anywhere. Delete once the experiment is resolved either way.
export default function TestIntentPage() {
  const intentUri =
    "intent://contacts#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir%2Fcontact;" +
    "S.name=IntentTest;S.phone=%2B441234567890;S.email=intenttest%40example.com;" +
    "S.browser_fallback_url=https%3A%2F%2Ftapcard.aiert.co.uk%2Ftapcard%2Ftest-intent%2Ffallback;end";

  return (
    <html>
      <body style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>Intent test</h1>
        <a
          id="save-link"
          href={intentUri}
          style={{ display: "inline-block", padding: "16px 24px", background: "#111318", color: "white", borderRadius: 8 }}
        >
          Save Contact (intent)
        </a>
      </body>
    </html>
  );
}
