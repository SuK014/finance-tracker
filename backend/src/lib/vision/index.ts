import type { VisionProvider } from "./types"

export type { SlipData } from "./types"

export function getVisionProvider(): VisionProvider {
  const provider = process.env.VISION_PROVIDER ?? "claude"

  if (provider === "claude") {
    const { ClaudeVisionProvider } = require("./claude")
    return new ClaudeVisionProvider()
  }

  if (provider === "gemini") {
    const { GeminiVisionProvider } = require("./gemini")
    return new GeminiVisionProvider()
  }

  throw new Error(`Unknown VISION_PROVIDER: "${provider}". Supported: claude, gemini`)
}
