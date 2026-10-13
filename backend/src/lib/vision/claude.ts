import Anthropic from "@anthropic-ai/sdk"
import type { VisionProvider, SlipData } from "./types"
import { SLIP_PROMPT } from "./prompt"

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
            { type: "text", text: SLIP_PROMPT },
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
