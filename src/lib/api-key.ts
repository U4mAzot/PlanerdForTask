import { createHash } from "crypto"
import { nanoid } from "nanoid"

export function generateApiKey(): string {
  return `kc_${nanoid(32)}`
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

export function getApiKeyHint(key: string): string {
  return key.slice(0, 6) + "•••" + key.slice(-4)
}
