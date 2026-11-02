// src/lib/ai/kaynak-taramasi.ts
// Amaç: Editörden gelen URL listesini güvenli şekilde çek, metin çıkar, original_text + kaynak URLleri oluştur
// Free: fetch + regex temizleme. No external key.

import { sanitizeInput } from './prompt-guard';

type KaynakSonuc = {
  original_text: string;
  kaynaklar: { url: string; title?: string }[];
  original_language: string;
};

const MAX_URL = 5;
const MAX_CHAR = 20000;

export async function kaynaklariTara(urls: string[], dilTahmin = 'auto'): Promise<KaynakSonuc> {
  // Güvenlik: input sanitization
  if (!Array.isArray(urls)) throw new Error('URL listesi gerekli');
  const temizUrls = urls.slice(0, MAX_URL).map(u => sanitizeInput(u)).filter(Boolean);

  const kaynaklar: KaynakSonuc['kaynaklar'] = [];
  const parcalar: string[] = [];

  for (const url of temizUrls) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'KainatKutuphanesiBot/1.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      
      // Basit HTML temizleme - free, no cheerio
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                        .replace(/<style[\s\S]*?<\/style>/gi, '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, MAX_CHAR);

      if (text.length < 100) continue;

      parcalar.push(`[Kaynak: ${url}]\n${text}`);
      kaynaklar.push({ url, title: parsed.hostname });
    } catch {}
  }

  if (parcalar.length === 0) throw new Error('Hiç kaynak metin alınamadı');

  return {
    original_text: parcalar.join('\n\n'),
    kaynaklar,
    original_language: dilTahmin
  };
}
