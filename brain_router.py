import json
with open("beyinler.json","r",encoding="utf-8") as f:
    BEYINLER = json.load(f)["beyinler"]

def otomatik_beyin_sec(prompt):
    # GECICI: Glimmer yogun, direkt Hizli Beyin ile cozelim - bypass
    # beyinler.json'da olmayan model icin KeyError vermesin diye direkt donuyoruz
    return "meta/muse-glimmer-30b", "Ana Beyin Builder"

if __name__ == "__main__":
    for test in ["Wikipedia API'den veri cek", "Rosa canina zehirli mi", "Bu fotograf hangi bitki", "hizlica bug duzelt"]:
        m, isim = otomatik_beyin_sec(test)
        print(f"{test} -> {isim} ({m})")