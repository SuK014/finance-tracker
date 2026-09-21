export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ height: "28px", width: "120px", background: "var(--border)", borderRadius: "6px", opacity: 0.6 }} />
      <div className="two-col-grid" style={{ gap: "24px" }}>
        {[0,1].map(col => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: "36px", background: "var(--border)", borderRadius: "8px", opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:.6} }`}</style>
    </div>
  )
}
