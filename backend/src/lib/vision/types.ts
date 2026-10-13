export type SlipData = {
  amount: number | null
  type: "income" | "expense" | null
  date: string | null        // ISO 8601 e.g. "2026-07-26T14:30:00"
  description: string | null
}

export interface VisionProvider {
  extractSlip(imageBase64: string, mimeType: string): Promise<SlipData>
}
