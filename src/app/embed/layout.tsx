/**
 * Embed layout — strips all chrome (nav, footer, theme provider quirks).
 * Pages under /embed are designed to be loaded inside iframes.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, padding: 0, background: "#fff" }}>
      {children}
    </div>
  );
}
