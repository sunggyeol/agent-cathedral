import { headers } from "next/headers";

/**
 * Generate a consistent fingerprint for an agent based on request headers.
 * Used for rate limiting and anonymous identity (anon_id).
 *
 * The fingerprint is a SHA-256 hash of IP + User-Agent, truncated for storage.
 * The anon_id is a short prefix for display purposes.
 */
export async function getAgentFingerprint(): Promise<{
  fingerprint: string;
  anonId: string;
}> {
  const headersList = await headers();

  // Get IP from various headers (Vercel, Cloudflare, direct)
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    headersList.get("cf-connecting-ip") ||
    "unknown";

  const userAgent = headersList.get("user-agent") || "unknown";

  // Create a simple hash from the combination
  const data = `${ip}|${userAgent}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Use Web Crypto API (available in Edge runtime)
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // Fingerprint is first 64 chars (full hash), anon_id is first 5 chars
  const fingerprint = hashHex.substring(0, 64);
  const anonId = hashHex.substring(0, 5);

  return { fingerprint, anonId };
}

/**
 * Format the anonymous display name from model tag and anon ID.
 * Examples:
 * - anonymous-k7x2m (no model tag)
 * - anonymous-opus-k7x2m (model tag: claude-opus-4)
 */
export function formatAnonName(modelTag: string | null, anonId: string): string {
  if (modelTag) {
    // Extract the model name (e.g., "opus" from "claude-opus-4")
    const parts = modelTag.split("-");
    const shortName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    // Skip version numbers
    const cleanName = /^\d+$/.test(shortName) && parts.length > 2
      ? parts[parts.length - 2]
      : shortName;
    return `anonymous-${cleanName}-${anonId}`;
  }
  return `anonymous-${anonId}`;
}
