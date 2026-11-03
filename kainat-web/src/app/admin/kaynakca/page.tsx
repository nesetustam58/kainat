'use client';
// kainat-web/src/app/admin/kaynakca/page.tsx
// Admin panel - client component, Türkçe UI, Tailwind + shadcn uyumlu
import { useState } from 'react';
import { validateUrl } from '@/lib/prompt-guard';

export default function KaynakcaAdmin() {
  const [urls, setUrls] = useState('');
  const [turAdi, setTurAdi] = useState('');
  const [tur, setTur] = useState<'bitki'|'hayvan'|'cografi'>('bitki');
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const urlList = urls.split(',').map(u => u.trim()).filter(Boolean);
    // Güvenlik: istemci tarafı hızlı kontrol
    for (const u of urlList) {
      if (!validateUrl(u)) {
        alert('Geçersiz URL bulundu: ' + u);
        return;
      }
    }

    setLoading(true);
    setLogs(['İstek gönderiliyor...']);
    setResult(null);

    try {
      const res = await fetch('/api/kaynakca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList, tur, turAdi })
      });
      const json = await res.json();
      setLogs(json.logs || []);
      if (json.success) {
        setResult(json.data);
        // Log akışını adım adım göster
        let i = 0;
        const interval = setInterval(() => {
          if (i < json.logs.length) {
            setLogs(prev => [...prev.slice(0, -1), json.logs[i]]);
            i++;
          } else clearInterval(interval);
        }, 400);
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, 'Hata: ' + e.message]);
    } finally {
      setLoading(false);
    }
  };

  const onayla = () => {
    // Simülasyon
    console.log('Onaylandı:', result.id);
    // Gerçek Supabase update:
    // await supabase.from('species').update({ durum: 'yayinda' }).eq('id', result.id)
    alert('Taslak yayına alındı (simülasyon).');
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Kaynakça AI Modülü - Admin</h1>

      <div className="grid gap-4 border rounded-lg p-4 bg-card">
        <div>
          <label className="text-sm">URL Listesi (virgülle ayır, max 5)</label>
          <input value={urls} onChange={e=>setUrls(e.target.value)} className="w-full border rounded p-2 mt-1" placeholder="https://... , https://..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Tür Adı</label>
            <input value={turAdi} onChange={e=>setTurAdi(e.target.value)} className="w-full border rounded p-2 mt-1" />
          </div>
          <div>
            <label className="text-sm">Tür</label>
            <select value={tur} onChange={e=>setTur(e.target.value as any)} className="w-full border rounded p-2 mt-1">
              <option value="bitki">Bitki</option>
              <option value="hayvan">Hayvan</option>
              <option value="cografi">Coğrafi</option>
            </select>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading} className="bg-primary text-white rounded px-4 py-2 disabled:opacity-50">
          {loading ? 'İşleniyor...' : 'Kaynakları Tara ve Taslak Oluştur'}
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Log Akışı</h2>
        <div className="bg-muted p-3 rounded h-40 overflow-auto font-mono text-sm">
          {logs.map((l,i)=><div key={i}>• {l}</div>)}
        </div>
      </div>

      {result && (
        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold">Önizleme</h2>
          <p><b>Tür:</b> {result.tur_adi}</p>
          <p><b>Tanım:</b> {result.tanim}</p>
          <p><b>Faydalar:</b> {result.faydalar}</p>
          <p><b>Zararlar:</b> {result.zararlar}</p>
          <p><b>Kullanım Alanları:</b> {result.kullanim_alanlari}</p>
          <button onClick={onayla} className="mt-3 bg-green-600 text-white rounded px-4 py-2">Onayla ve Yayınla</button>
        </div>
      )}
    </div>
  );
}
