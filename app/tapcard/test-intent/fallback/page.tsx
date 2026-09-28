export default function FallbackPage() {
  return (
    <html>
      <body style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>Fallback reached</h1>
        <p>The intent:// link fell back to this page (activity not resolvable).</p>
      </body>
    </html>
  );
}
