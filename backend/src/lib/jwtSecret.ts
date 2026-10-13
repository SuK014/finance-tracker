// Fails fast at boot if JWT_SECRET is missing, instead of silently signing
// and verifying tokens with a publicly-known fallback value.
const secret = process.env.JWT_SECRET
if (!secret) {
  throw new Error("JWT_SECRET environment variable is required — refusing to start without it.")
}

export const JWT_SECRET: string = secret
