"""Shared Jev plumbing for the generator scripts. The only place that does I/O."""
import hashlib, json, os, time, urllib.error, urllib.request

ENDPOINT = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"
MAX_CHOICES = 255           # Jev rejects a choice question above this.
PRICE_PER_TOKEN = 0.042 / 1e6

def api_key() -> str:
    for line in open(".env", encoding="utf-8"):
        if line.startswith("TYPESAFE_API_KEY"):
            return line.split("=", 1)[1].strip()
    raise SystemExit("TYPESAFE_API_KEY missing from .env")

KEY = api_key()
usage = {"tokens": 0, "calls": 0}

def ask(state, questions, tries=5):
    """POST one request, retrying on the documented transient codes."""
    body = {"model": MODEL, "state": state, "questions": questions}
    for attempt in range(tries):
        try:
            req = urllib.request.Request(
                ENDPOINT, json.dumps(body).encode(),
                {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
            data = json.load(urllib.request.urlopen(req, timeout=180))
            usage["tokens"] += data["usage"]["input_tokens"]
            usage["calls"] += 1
            return data["answers"]
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 529) and attempt < tries - 1:
                time.sleep(2 ** attempt); continue
            raise
        except Exception:
            if attempt < tries - 1:
                time.sleep(2 ** attempt); continue
            raise

def spend() -> str:
    return f"{usage['calls']} calls, {usage['tokens']:,} tok, ${usage['tokens']*PRICE_PER_TOKEN:.3f}"

class Cache:
    """Content-addressed cache. The key carries a version so tuning a prompt
    invalidates only what it should.

    A pass writes one small file per answer, which keeps it resumable while it
    runs. bin/pack.py folds those into a single cache/<name>.pack.json for the
    repository; a packed cache is read here transparently, so the bank can be
    rebuilt with no API key and no loose files.
    """
    def __init__(self, name, version):
        self.dir = os.path.join("cache", name)
        self.version = version
        os.makedirs(self.dir, exist_ok=True)
        self.pack = {}
        pack_path = os.path.join("cache", f"{name}.pack.json")
        if os.path.exists(pack_path):
            try:
                self.pack = json.load(open(pack_path, encoding="utf-8"))
            except Exception:
                self.pack = {}

    def path(self, ident):
        digest = hashlib.sha1(f"{self.version}|{ident}".encode()).hexdigest()
        return os.path.join(self.dir, f"{digest}.json")

    def get(self, ident):
        digest = hashlib.sha1(f"{self.version}|{ident}".encode()).hexdigest()
        if digest in self.pack:
            return self.pack[digest]
        p = self.path(ident)
        if os.path.exists(p):
            try:
                return json.load(open(p, encoding="utf-8"))
            except json.JSONDecodeError:
                return None
        return None

    def put(self, ident, value):
        tmp = self.path(ident) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(value, fh)
        os.replace(tmp, self.path(ident))     # atomic: no torn cache entries
        return value
