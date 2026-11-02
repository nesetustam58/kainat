from openai import OpenAI
import os
import sys
import re
from pathlib import Path

# .env.local'i otomatik oku - export'a gerek kalmasin
if os.path.exists("kainat-web/.env.local"):
    try:
        with open("kainat-web/.env.local","r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k,v = line.strip().split("=",1)
                    if k not in os.environ:
                        os.environ[k] = v.strip().strip('"').strip("'")
    except: pass

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=os.environ.get("NVIDIA_API_KEY")
)

IZINLI_YOLLAR = [
    "kainat-web/src/lib/ai/",
    "kainat-web/app/api/kaynakca/",
    "kainat-web/app/admin/kaynakca/",
    "kainat-web/docs/",
    "kainat-web/src/lib/",
    "kainat-web/app/",
    "kainat-web/backup.sh",
    "kainat-web/docker-compose.yml"
]

def guvenli_dosya_yaz(dosya_yolu, icerik):
    dosya_yolu = dosya_yolu.strip().replace("`","").replace("./","").strip()
    dosya_yolu = dosya_yolu.replace("kainat-web/kainat-web/", "kainat-web/")
    if ".." in dosya_yolu or ".env" in dosya_yolu or "node_modules" in dosya_yolu or ".next" in dosya_yolu:
        return f"⛔ GUVENLIK: Yasakli yol -> {dosya_yolu}"
    if not dosya_yolu.startswith("kainat-web/"):
        if "/" not in dosya_yolu:
            dosya_yolu = f"kainat-web/src/lib/ai/{dosya_yolu}"
        elif dosya_yolu.startswith(("src/", "app/", "docs/")) or dosya_yolu.endswith((".sh", ".yml", ".yaml")):
            dosya_yolu = f"kainat-web/{dosya_yolu}"
    izinli = False
    for izin in IZINLI_YOLLAR:
        if dosya_yolu == izin or dosya_yolu.startswith(izin):
            izinli = True
            break
    if not izinli:
        return f"⛔ GUVENLIK: Izin disi yol -> {dosya_yolu}"
    try:
        Path(dosya_yolu).parent.mkdir(parents=True, exist_ok=True)
        if os.path.exists(dosya_yolu):
            with open(dosya_yolu, 'r', encoding='utf-8') as old:
                with open(dosya_yolu + ".bak", 'w', encoding='utf-8') as bak:
                    bak.write(old.read())
        with open(dosya_yolu, 'w', encoding='utf-8') as f:
            f.write(icerik)
        return f"✅ Yazildi: {dosya_yolu} ({len(icerik)} karakter)"
    except Exception as e:
        return f"❌ HATA yazarken {dosya_yolu}: {e}"

def get_system_prompt():
    base = "Sen Kainat Kutuphanesi'nin uzman biyolog ve yazilim mimarisin. Dogru, kisa ve JSON'a uygun cevap ver. Clean code, free ve acik kaynak onceligin var."
    if os.path.exists("proje_detay.md"):
        try:
            with open("proje_detay.md", "r", encoding="utf-8") as f:
                detay = f.read()[:2000]
            base += f"\n\nPROJE ORYANTASYON BILGISI:\n{detay}"
        except: pass
    return base

def sor_beyne(soru, model="meta/muse-glimmer-30b", sistem=None, max_tokens=2000, stream=False):
    # DEBUG - anahtar ve model kontrol
    api_key = os.environ.get("NVIDIA_API_KEY","")
    print(f"🔑 Key var mi? {len(api_key)} karakter, baslangic: {api_key[:10]}...")
    print(f"🤖 Model: {model}, Soru uzunlugu: {len(soru)}")
    if sistem is None: sistem = get_system_prompt()
    try:
        if stream:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role":"system","content":sistem},{"role":"user","content":soru}],
                temperature=0.4, max_tokens=max_tokens, stream=True
            )
            full = ""
            for chunk in resp:
                delta = chunk.choices[0].delta.content
                if delta:
                    sys.stdout.write(delta); sys.stdout.flush(); full += delta
            print()
        else:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role":"system","content":sistem},{"role":"user","content":soru}],
                temperature=0.4, max_tokens=max_tokens
            )
            full = resp.choices[0].message.content
            print(f"📥 Gelen cevap uzunlugu: {len(full) if full else 0}")
            print(full)

        # OTOMATIK DOSYA YAZMA
        dosya_pattern = r"###\s*\d+\.\s*([^\n`]+)\n```(?:\w+)?\n(.*?)```"
        yazilanlar = []
        for match in re.finditer(dosya_pattern, full if full else "", re.DOTALL):
            yol = match.group(1).strip()
            kod = match.group(2)
            sonuc = guvenli_dosya_yaz(yol, kod)
            yazilanlar.append(sonuc); print(sonuc)
        if yazilanlar: print(f"\n🎉 Toplam {len(yazilanlar)} dosya yazildi!")
        return full
    except Exception as e:
        import traceback
        print(f"❌ HATA detayi: {e}")
        traceback.print_exc()
        return f"HATA: {e}"

if __name__ == "__main__":
    print(sor_beyne("Rosa canina nedir? 1 cumle", max_tokens=800, stream=False))