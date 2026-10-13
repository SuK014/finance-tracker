import type { VisionProvider, SlipData } from "./types"
import { SLIP_PROMPT } from "./prompt"

// Google Gemini via the plain REST API (no extra dependency). Get a free key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY; free-tier limits
// and model names change, so the model is configurable via GEMINI_MODEL.
export class GeminiVisionProvider implements VisionProvider {
  private apiKey: string
  private model: string

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set")
    this.apiKey = apiKey
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  }

  async extractSlip(imageBase64: string, mimeType: string): Promise<SlipData> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: SLIP_PROMPT },
              ],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      }
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      throw new Error(`Gemini request failed (${res.status}): ${detail.slice(0, 200)}`)
    }

    const body = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? ""
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    if (!json) throw new Error("No JSON in Gemini response")
    return JSON.parse(json) as SlipData
  }
}
