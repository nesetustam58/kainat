// src/lib/ai/icerik-ozetle.ts
// Amaç: original_text'ten tür bilgilerini yapılandırılmış şekilde çıkar
// Free/Open Source: Ollama self-hosted http://localhost:11434
// Güvenlik: prompt injection koruması + input limit

import { sanitizeInput, detectPromptInjection } from './prompt-guard';

export type TurAlanlari = {
  tanim: string;
  yetisme_sekli: string;
  iklimi: string;
  yetistigi_bolgeler: string;
  yetistirme_sekli: string;
  faydalar: string;
  zararlar: string;
  kullanim_alanlari: string;
};

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3.1:8b';
const MAX_INPUT = 12000;

export async function icerikOzetle(original_text: string, tur: 'bitki' | 'hayvan' | 'cografi' = 'bitki'): Promise<TurAlanlari> {
  const temiz = sanitizeInput(original_text).slice(0, MAX_INPUT);
  if (detectPromptInjection(temiz)) throw new Error('Potansiyel prompt injection tespit edildi');

  const sistemPrompt = `Sen Kainat Kütüphanesi veri çıkarıcısısın. Sadece verilen metinden bilgi çıkar. 
Cevabı JSON olarak ver. Alanlar: tanim, yetisme_sekli, iklimi, yetistigi_bolgeler, yetistirme_sekli, faydalar, zararlar, kullanim_alanlari.
Bilinmiyorsa boş string bırak. Ek yorum yapma.`;

  const userPrompt = `Tür: ${tur}\nMetin:\n${temiz}`;

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: `${sistemPrompt}\n\n${userPrompt}`, stream: false, options: { temperature: 0.2 } }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) throw new Error('Ollama yanıt vermedi');

  const data = await res.json();
  const output = data.response || '{}';

  try {
    const parsed = JSON.parse(output);
    return {
      tanim: parsed.tanim || '',
      yetisme_sekli: parsed.yetisme_sekli || '',
      iklimi: parsed.iklimi || '',
      yetistigi_bolgeler: parsed.yetistigi_bolgeler || '',
      yetistirme_sekli: parsed.yetistirme_sekli || '',
      faydalar: parsed.faydalar || '',
      zararlar: parsed.zararlar || '',
      kullanim_alanlari: parsed.kullanim_alanlari || ''
    };
  } catch {
    // JSON parse başarısızsa güvenli fallback
    return {
      tanim: '', yetisme_sekli: '', iklimi: '', yetistigi_bolgeler: '',
      yetistirme_sekli: '', faydalar: '', zararlar: '', kullanim_alanlari: ''
    };
  }
}
