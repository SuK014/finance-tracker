"use client"

// Baht or US dollar, for a price that may be billed in either.
export default function CurrencyToggle({ value, onChange }: { value: string; onChange: (currency: string) => void }) {
  return (
    <div className="seg" role="group" aria-label="Price currency">
      {[{ v: "THB", l: "Baht ฿" }, { v: "USD", l: "US dollar $" }].map(o => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  )
}
