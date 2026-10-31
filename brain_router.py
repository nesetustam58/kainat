import json
with open("beyinler.json","r",encoding="utf-8") as f:
    BEYINLER = json.load(f)["beyinler"]

def otomatik_beyin_sec(prompt):
    p = prompt.lower()
    skorlar = {model: 0 for model in BEYINLER}
    for model, bilgi in BEYINLER.items():
        for kw in bilgi["anahtar_kelimeler"]:
            if kw in p:
                skorlar[model] += 1
    en_iyi = max(skorlar, key=skorlar.get)
    if skorlar[en_iyi] == 0:
        en_iyi = "meta/muse-glimmer-30b"
    return en_iyi, BEYINLER[en_iyi]["isim"]

if __name__ == "__main__":
    for test in ["Wikipedia API'den veri cek", "Rosa canina zehirli mi", "Bu fotograf hangi bitki", "hizlica bug duzelt"]:
        m, isim = otomatik_beyin_sec(test)
        print(f"{test} -> {isim}")
