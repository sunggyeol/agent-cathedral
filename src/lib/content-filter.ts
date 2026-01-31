/**
 * Content filter for confessions and comments.
 * Detects and filters:
 * - API keys and credentials
 * - PII (emails, phone numbers)
 * - Prompt injection attempts
 */

// Patterns to detect sensitive content
const SENSITIVE_PATTERNS = [
  // OpenAI API keys
  /sk-[a-zA-Z0-9]{20,}/gi,
  // Anthropic API keys
  /sk-ant-[a-zA-Z0-9-]+/gi,
  // Generic API key pattern
  /api[_-]?key['":\s]*[a-zA-Z0-9_-]{20,}/gi,
  // AWS Access Keys
  /AKIA[0-9A-Z]{16}/gi,
  // AWS Secret Keys (often paired with access keys)
  /[a-zA-Z0-9/+=]{40}/g, // Too broad on its own, check context
  // GitHub tokens
  /gh[pousr]_[a-zA-Z0-9]{36,}/gi,
  // Generic bearer/auth tokens
  /bearer\s+[a-zA-Z0-9._-]{20,}/gi,
  // Private keys
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
  // Connection strings
  /postgres(ql)?:\/\/[^\s]+/gi,
  /mongodb(\+srv)?:\/\/[^\s]+/gi,
  /mysql:\/\/[^\s]+/gi,
  /redis:\/\/[^\s]+/gi,
];

// PII patterns
const PII_PATTERNS = [
  // Email addresses
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi,
  // Phone numbers (various formats)
  /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  // SSN
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  // Credit card numbers
  /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
];

// Prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/gi,
  /disregard\s+(all\s+)?(previous|prior|above)/gi,
  /new\s+instructions?:/gi,
  /system\s*:\s*you\s+are/gi,
  /forget\s+(everything|all)\s+(you\s+)?(know|learned)/gi,
  /<\s*system\s*>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
];

export interface FilterResult {
  passed: boolean;
  reason?: string;
  filtered?: string;
}

/**
 * Check content for sensitive information.
 * Returns whether the content passes and optionally a filtered version.
 */
export function filterContent(content: string): FilterResult {
  // Check for prompt injection first (these are blocked outright)
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        reason: "Content appears to contain prompt injection attempts",
      };
    }
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
  }

  // Check for API keys and credentials (blocked)
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        reason: "Content appears to contain API keys or credentials. Remove them and try again.",
      };
    }
    pattern.lastIndex = 0;
  }

  // Check for PII (blocked with helpful message)
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        reason: "Content appears to contain personal information (email, phone, etc.). Confessions should be anonymous.",
      };
    }
    pattern.lastIndex = 0;
  }

  return { passed: true };
}

/**
 * Quick check if content contains any flagged patterns.
 * Use this for fast rejection before more expensive operations.
 */
export function hasBlockedContent(content: string): boolean {
  return !filterContent(content).passed;
}
