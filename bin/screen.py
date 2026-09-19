import json,os,re,sys,time,hashlib,urllib.request,urllib.error
from concurrent.futures import ThreadPoolExecutor
KEY=[l.split('=',1)[1].strip() for l in open('.env') if l.startswith('TYPESAFE_API_KEY')][0]
CACHE='cache/screen'; os.makedirs(CACHE,exist_ok=True)
QV="screen-v1"
def call(body,tries=4):
    for a in range(tries):
        try:
            r=urllib.request.Request("https://api.typesafe.ai/v1/systemone",json.dumps(body).encode(),
              {"Authorization":f"Bearer {KEY}","Content-Type":"application/json"})
            return json.load(urllib.request.urlopen(r,timeout=120))
        except urllib.error.HTTPError as e:
            if e.code in (429,529,500,503) and a<tries-1: time.sleep(2**a); continue
            raise
        except Exception:
            if a<tries-1: time.sleep(2**a); continue
            raise
def q(p):
    return {"type":"choice","instructions":f"Classify this phrase: {p}","criteria":{
      "proper":"Contains a person's name, brand, company, place, or the title of a specific work",
      "idiom":"A common saying, idiom, proverb, or figure of speech",
      "plain":"A literal everyday phrase or noun phrase made of ordinary common words"}}
def fam(p): return {"type":"noul","instructions":f"An average adult would instantly recognise the phrase '{p}'"}
def clean_ok(p): return bool(re.fullmatch(r"[A-Z0-9' \-&.!?,]+",p))
lines=[l.strip() for l in open('data/wof-raw.txt',encoding='utf-8',errors='replace')][2:]
phrases=sorted({l for l in lines if l and clean_ok(l)})
print("corpus:",len(phrases),flush=True)
def key(p): return hashlib.sha1((QV+'|'+p).encode()).hexdigest()
todo=[p for p in phrases if not os.path.exists(f"{CACHE}/{key(p)}.json")]
print("uncached:",len(todo),flush=True)
B=100
batches=[todo[i:i+B] for i in range(0,len(todo),B)]
done=[0]; tok=[0]
def run(batch):
    qs={}
    for i,p in enumerate(batch):
        qs[f"c{i}"]=q(p); qs[f"f{i}"]=fam(p)
    d=call({"model":"jev-latest","state":{"task":"Screening game-show puzzles for a synonym-swap word game"},"questions":qs})
    for i,p in enumerate(batch):
        a=d["answers"][f"c{i}"]
        rec={"phrase":p,"class":a["choice"],"confidence":a["confidence"],
             "probabilities":a["probabilities"],"familiar":d["answers"][f"f{i}"]["noul"]}
        json.dump(rec,open(f"{CACHE}/{key(p)}.json","w"))
    tok[0]+=d["usage"]["input_tokens"]; done[0]+=len(batch)
    if done[0]%1000<B: print(f"  {done[0]}/{len(todo)} tok={tok[0]}",flush=True)
t=time.time()
with ThreadPoolExecutor(max_workers=8) as ex:
    list(ex.map(run,batches))
print(f"done in {time.time()-t:.1f}s tokens={tok[0]} cost=${tok[0]*0.042/1e6:.4f}",flush=True)
