export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px" }}>
      {[240, 120, 200].map((h, i) => (
        <div key={i} style={{ height: h, background: "var(--border)", borderRadius: "10px", opacity: 0.6, animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }`}</style>
    </div>
  )
}
