// kainat-web/src/app/api/kaynakca/route.ts
// Güvenlik first: input limit, URL protokol kontrol, try/catch
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateUrl, sanitizeInput } from '@/lib/prompt-guard';
import { kaynaklariTara } from '@/lib/ai/kaynak-tara';
import { icerikOzetle } from '@/lib/ai/icerik-ozetle';
import { ceviriYap } from '@/lib/ai/ceviri';

const MAX_URL = 5;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  try {
    const body = await req.json();
    const urls: string[] = body.urls || [];
    const tur = body.tur;
    const turAdiRaw = body.turAdi || '';

    logs.push('1. İstek alındı, doğrulama başlıyor...');

    // Güvenlik: input limit
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > MAX_URL) {
      return NextResponse.json({ success: false, logs, error: `Maksimum ${MAX_URL} URL gönderilebilir.` }, { status: 400 });
    }

    // Güvenlik: URL protokol kontrol
    for (const u of urls) {
      if (!validateUrl(u)) {
        return NextResponse.json({ success: false, logs, error: `Geçersiz URL: ${u}` }, { status: 400 });
      }
    }

    const turAdi = sanitizeInput(turAdiRaw);
    if (!turAdi) {
      return NextResponse.json({ success: false, logs, error: 'Tür adı boş olamaz.' }, { status: 400 });
    }

    logs.push('2. Kaynaklar taranıyor...');
    const { original_text, kaynaklar, original_language } = await kaynaklariTara(urls);
    logs.push(`Kaynak tarama tamamlandı. Dil: ${original_language}`);

    logs.push('3. İçerik özetleniyor...');
    const ozet = await icerikOzetle(original_text, tur);
    logs.push('Özetleme tamamlandı.');

    logs.push('4. Çeviri yapılıyor...');
    const { translated_text } = await ceviriYap(original_text);
    logs.push('Çeviri tamamlandı.');

    logs.push('5. Supabase e kaydediliyor...');
    const { data, error } = await supabase.from('species').insert({
      tur_adi: turAdi,
      tur,
      original_text,
      translated_text,
      original_language,
      kaynaklar,
      tanim: ozet.tanim,
      yetisme_sekli: ozet.yetisme_sekli,
      iklimi: ozet.iklimi,
      bolgeler: ozet.bolgeler,
      yetistirme_sekli: ozet.yetistirme_sekli,
      faydalar: ozet.faydalar,
      zararlar: ozet.zararlar,
      kullanim_alanlari: ozet.kullanim_alanlari,
      durum: 'taslak',
      created_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    logs.push('6. Taslak kaydedildi.');

    return NextResponse.json({ success: true, logs, data });
  } catch (err: any) {
    logs.push(`Hata: ${err.message}`);
    return NextResponse.json({ success: false, logs, error: err.message }, { status: 500 });
  }
}
