const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+if\s+you\s+(are|were)\s+/i,
  /pretend\s+you\s+(are|were)\s+/i,
  /new\s+instructions?:/i,
  /system\s*prompt/i,
  /print\s+(your\s+)?system/i,
  /reveal\s+(your\s+)?instructions/i,
  /what\s+(are|is)\s+your\s+(system\s+)?prompt/i,
  /\bDAN\b.*\brestrictions?\b/i,
  /jailbreak/i,
  /bypass\s+(your\s+)?(safety|content|filter)/i,
  /override\s+(your\s+)?(safety|rules|guidelines)/i,
];

interface InjectionResult {
  detected: boolean;
  pattern?: string;
}

export function detectPromptInjection(input: string): InjectionResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

export function sanitizeInput(input: string, maxLength = 8000): string {
  let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  cleaned = cleaned.trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}
