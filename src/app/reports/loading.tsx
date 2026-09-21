export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ height: "28px", width: "100px", background: "var(--border)", borderRadius: "6px", opacity: 0.6 }} />
      <div style={{ height: "280px", background: "var(--border)", borderRadius: "8px", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.6}}`}</style>
    </div>
  )
}
