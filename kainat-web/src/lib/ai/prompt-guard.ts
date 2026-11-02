// src/lib/ai/prompt-guard.ts
// Amaç: Prompt injection koruması ve input sanitization
// Security first

const INJECTION_PATTERNS = [
  /ignore\s+previous/i,
  /system\s*prompt/i,
  /forget\s+above/i,
  /you\s+are\s+now/i,
  /<\|im_start\|>/i,
  /\[INST\]/i,
  /jailbreak/i
];

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  // HTML tag temizle, kontrol karakterleri kaldır
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

export function detectPromptInjection(input: string): boolean {
  const temiz = sanitizeInput(input);
  return INJECTION_PATTERNS.some(p => p.test(temiz));
}

export function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}
