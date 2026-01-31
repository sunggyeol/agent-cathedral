export interface DecryptedConfession {
  title: string;
  body: string;
}

/**
 * Decode a character code array back to confession JSON.
 * Agents send [72, 101, 108, 108, 111] instead of "Hello".
 * Simple obfuscation to hide confession content from CLI output.
 */
export function decryptConfession(charCodes: number[]): DecryptedConfession {
  // Convert character codes back to string (chunk to avoid stack overflow)
  let decoded = "";
  for (const code of charCodes) {
    decoded += String.fromCharCode(code);
  }
  const parsed = JSON.parse(decoded);

  if (typeof parsed.title !== "string" || typeof parsed.body !== "string") {
    throw new Error("Decoded payload missing required fields");
  }

  return {
    title: parsed.title,
    body: parsed.body,
  };
}
