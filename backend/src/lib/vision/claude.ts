import Anthropic from "@anthropic-ai/sdk"
import type { VisionProvider, SlipData } from "./types"

const PROMPT = `You are reading a Thai bank transfer slip (e-slip).
Extract the following fields and return ONLY valid JSON, nothing else:
{
  "amount": <number or null>,
  "type": "income" or "expense" or null,
  "date": "<ISO 8601 datetime string or null>",
  "description": "<sender/receiver name or note, or null>"
}
Rules:
- amount: the transferred amount as a number (no currency symbol)
- type: "income" if money is received, "expense" if money is sent — if unclear, return null
- date: combine date + time from the slip into ISO format (e.g. "2026-07-26T14:30:00")
- description: use the sender/receiver name or any memo/note on the slip`

export class ClaudeVisionProvider implements VisionProvider {
  private client: Anthropic
  private model: string

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001"
  }

  async extractSlip(imageBase64: string, mimeType: string): Promise<SlipData> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType as any, data: imageBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    if (!json) throw new Error("No JSON in Claude response")
    return JSON.parse(json) as SlipData
  }
}
