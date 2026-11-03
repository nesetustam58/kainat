from openai import OpenAI
import os, sys, re, time
from pathlib import Path
if os.path.exists("kainat-web/.env.local"):
    try:
        with open("kainat-web/.env.local","r",encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k,v=line.strip().split("=",1)
                    if k not in os.environ: os.environ[k]=v.strip().strip('"').strip("'")
    except: pass
client=OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=os.environ.get("NVIDIA_API_KEY"))
IZINLI_YOLLAR=["kainat-web/src/lib/ai/","kainat-web/src/app/api/kaynakca/","kainat-web/src/app/admin/kaynakca/","kainat-web/app/api/kaynakca/","kainat-web/app/admin/kaynakca/","kainat-web/docs/","kainat-web/src/lib/","kainat-web/src/app/","kainat-web/app/","backup.sh","kainat-web/backup.sh","kainat-web/docker-compose.yml"]
def guvenli_dosya_yaz(yol, icerik):
    yol=yol.strip().replace("`","").replace("./","").strip().replace("kainat-web/kainat-web/","kainat-web/")
    if ".." in yol or ".env" in yol or "node_modules" in yol or ".next" in yol: return f"⛔ Yasakli: {yol}"
    if not yol.startswith("kainat-web/") and not yol.startswith("backup.sh"):
        if "/" not in yol: yol=f"kainat-web/src/lib/ai/{yol}"
        elif yol.startswith(("src/","app/")) or yol.endswith((".sh",".yml",".yaml",".ts",".tsx")): yol=f"kainat-web/{yol}"
    ok=False
    for iz in IZINLI_YOLLAR:
        if yol==iz or yol.startswith(iz): ok=True; break
    if not ok: return f"⛔ Izin disi: {yol}"
    try:
        Path(yol).parent.mkdir(parents=True, exist_ok=True)
        if os.path.exists(yol):
            with open(yol,'r',encoding='utf-8') as old: open(yol+".bak",'w',encoding='utf-8').write(old.read())
        with open(yol,'w',encoding='utf-8') as f: f.write(icerik)
        return f"✅ Yazildi: {yol} ({len(icerik)} karakter)"
    except Exception as e: return f"❌ HATA {yol}: {e}"
def get_system_prompt():
    base="Sen Kainat Kutuphanesi'nin uzman biyolog ve yazilim mimarisin. Dogru, kisa ve JSON'a uygun cevap ver. Clean code, free ve acik kaynak onceligin var."
    if os.path.exists("proje_detay.md"):
        try:
            with open("proje_detay.md","r",encoding="utf-8") as f: base+=f"\n\nPROJE:\n{f.read()[:2000]}"
        except: pass
    return base
def sor_beyne(soru, model="meta/muse-glimmer-30b", sistem=None, max_tokens=6000, stream=False):
    api_key=os.environ.get("NVIDIA_API_KEY","")
    print(f"🔑 Key {len(api_key)} kar, 🤖 {model}, Soru {len(soru)}")
    if sistem is None: sistem=get_system_prompt()
    for deneme in range(3):
        try:
            resp=client.chat.completions.create(model=model, messages=[{"role":"system","content":sistem},{"role":"user","content":soru}], temperature=0.4, max_tokens=max_tokens)
            full=resp.choices[0].message.content or ""
            print(f"📥 Gelen: {len(full)} kar")
            # debug için tam çıktıyı kaydet
            Path("/tmp/son_beyin_ciktisi.md").write_text(full, encoding="utf-8")
            print("💾 Tam çıktı /tmp/son_beyin_ciktisi.md'e kaydedildi")
            # 2 desen dene: ### 1. path + codeblock ve sadece path + codeblock
            patterns=[r"###\s*\d+\.\s*([^\n`]+)\n```(?:\w+)?\n(.*?)```", r"([^\n`]+?\.(?:ts|tsx|js|sh))\n```(?:\w+)?\n(.*?)```"]
            yazilanlar=[]
            for pat in patterns:
                for m in re.finditer(pat, full, re.DOTALL):
                    yol=m.group(1).strip(); kod=m.group(2)
                    # gereksiz başlık temizle
                    if yol.startswith("#"): continue
                    if len(kod)<20: continue
                    sonuc=guvenli_dosya_yaz(yol, kod)
                    if "Yazildi" in sonuc and sonuc not in yazilanlar:
                        yazilanlar.append(sonuc); print(sonuc)
            if yazilanlar: print(f"\n🎉 Toplam {len(yazilanlar)} dosya yazildi!")
            else:
                print("⚠️ Dosya deseni eşleşmedi, ilk 500 kar:\n", full[:500])
            return full
        except Exception as e:
            print(f"❌ HATA deneme {deneme+1}: {e}")
            if "504" in str(e) or "500" in str(e):
                if deneme<2:
                    bekle=5*(deneme+1); print(f"⏳ {bekle}sn bekle..."); time.sleep(bekle); continue
            import traceback; traceback.print_exc(); return f"HATA: {e}"