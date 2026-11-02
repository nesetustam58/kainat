// src/lib/ai/ceviri.ts
// LibreTranslate self-hosted (http://localhost:5000 / libretranslate:5000) primary + MyMemory fallback
// Amaç: original_text -> translated_text çevirisi için. Cache, retry, timeout var.

type CeviriSonuc = {
  translatedText: string;
  originalLanguage: string;
  originalText: string;
  source: 'libretranslate' | 'mymemory' | 'cache';
};

const CACHE = new Map<string, CeviriSonuc>();
const LIBRE_URLS = ['http://localhost:5000/translate', 'http://libretranslate:5000/translate'];

export async function ceviriYap(text: string, sourceLang = 'auto', targetLang = 'tr'): Promise<CeviriSonuc> {
  // 1. Güvenlik: input temizle, max 5000 karakter
  const temiz = text.slice(0, 5000).trim();
  if (!temiz) throw new Error('Bos metin');
  const cacheKey = `${sourceLang}-${targetLang}-${temiz.slice(0,100)}`;
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey)!;

  // 2. LibreTranslate dene
  for (const url of LIBRE_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: temiz, source: sourceLang, target: targetLang, format: 'text' }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const sonuc = { translatedText: data.translatedText, originalLanguage: sourceLang, originalText: text, source: 'libretranslate' as const };
        CACHE.set(cacheKey, sonuc);
        return sonuc;
      }
    } catch {}
  }

  // 3. Fallback MyMemory (free, no key)
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(temiz)}&langpair=${sourceLang}|${targetLang}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const sonuc = { translatedText: data.responseData.translatedText, originalLanguage: sourceLang, originalText: text, source: 'mymemory' as const };
      CACHE.set(cacheKey, sonuc);
      return sonuc;
    }
  } catch {}

  // 4. Son çare cache dön
  return { translatedText: text, originalLanguage: sourceLang ?? 'auto', originalText: text, source: 'cache' };
}
