from openai import OpenAI
import os

client = OpenAI(
  base_url="https://integrate.api.nvidia.com/v1",
  api_key=os.environ.get("NVIDIA_API_KEY")
)

def sor_beyne(soru, model="meta/muse-glimmer-30b"):
    try:
        print(f"Deniyor: {model}")
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role":"user","content":soru}],
            temperature=0.7,
            max_tokens=500
        )
        return resp.choices[0].message.content
    except Exception as e:
        print(f"Hata {model}: {e}")
        return None

# 3 modeli dene
for m in ["meta/muse-glimmer-30b", "meta/llama-3.1-70b-instruct", "【entity-nvidia¦canonical_name=NVIDIA】/llama-3.1-nemotron-70b-instruct"]:
    cevap = sor_beyne("Rosa canina nedir? 1 cumle", model=m)
    if cevap:
        print(f"\n✅ CALISTI {m}: {cevap[:300]}")
        break
