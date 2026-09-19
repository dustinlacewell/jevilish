"""Fold the per-answer cache files into one JSON per pass.

30k small files is the right shape while a pass is running and resumable, and
the wrong shape for a repository. Packing keeps the cache committable so the
bank rebuilds without an API key; bin/lib.py reads a pack transparently.
"""
import glob, json, os, sys

def pack(name):
    paths = glob.glob(f"cache/{name}/*.json")
    if not paths:
        return
    out = {}
    for path in paths:
        try:
            out[os.path.basename(path)[:-5]] = json.load(open(path, encoding="utf-8"))
        except Exception:
            continue
    with open(f"cache/{name}.pack.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    size = os.path.getsize(f"cache/{name}.pack.json") / 1024 / 1024
    print(f"  {name}: {len(out)} entries -> {size:.1f} MB")

if __name__ == "__main__":
    for name in sys.argv[1:] or ["screen", "tag", "safety", "score", "fit"]:
        pack(name)
