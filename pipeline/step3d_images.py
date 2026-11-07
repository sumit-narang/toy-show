"""Step 3d — give every product a photo, saved locally so it can't break later.

Tries the image from the toy's retailer page first, then a Bing image search for
its name, choosing the result whose title best matches the toy. Every image is
opened, size-checked and re-encoded, so anything saved is a real picture.

Output: ../frontend/public/toys/{toy_id}.webp, data/image_sources/{toy_id}.json
data/image_queries.json holds better searches for toys whose photo was wrong when
checked by eye. A redo adds the old image to that toy's rejected list.

Usage:  python step3d_images.py [--limit N] [--redo id ...] [--redo-queries] [--trim-existing]
White margins are trimmed so the product fills its tile.
"""
import html
import io
import json
import re
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote_plus, urlparse

import requests
from PIL import Image, ImageChops, ImageStat

from step3_gather import ROOT, UA, toy_id
from step5_build import load, pick_image

IMAGES = ROOT.parent / "frontend" / "public" / "toys"
SOURCES = ROOT / "data" / "image_sources"
MAX_SIDE = 480
MIN_SIDE = 150
MAX_BYTES = 15_000_000
# Stock-photo sites watermark their images
BLOCKED_HOSTS = ("alamy", "shutterstock", "gettyimages", "dreamstime", "istockphoto", "123rf", "depositphotos", "adobe")
# Junk that image search can return for ordinary product names
UNSAFE = re.compile(r"\b(slot|slots|gacor|casino|judi|togel|betting|porn|xxx|nude|escort)\b", re.I)
QUERIES = load(ROOT / "data" / "image_queries.json") or {}
STOPWORDS = {"the", "a", "an", "of", "and", "for", "with", "by", "in", "to", "selection", "set", "toy", "toys", "assorted", "assortment", "ass"}


def tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w[:-1] if len(w) > 3 and w.endswith("s") else w for w in words} - STOPWORDS


def query_for(item: dict) -> str:
    name = re.sub(r"^selection of\s+", "", item["name"], flags=re.I)
    name = re.sub(r"\([^)]*\)", " ", name)
    if item["kind"] == "book":
        return f"{name} book cover"
    return f"{name} toy" if len(tokens(name)) <= 2 else name


def search(query: str, session: requests.Session) -> list[dict]:
    url = f"https://www.bing.com/images/search?q={quote_plus(query)}&form=HDRSC2&adlt=strict"
    for attempt in range(4):
        try:
            r = session.get(url, headers=UA, timeout=25)
            found = re.findall(r'\bm="(\{[^"]+\})"', r.text)
            if r.status_code == 200 and found:
                return [json.loads(html.unescape(m)) for m in found]
        except (requests.RequestException, json.JSONDecodeError):
            pass
        time.sleep(3 * (attempt + 1))
    return []


def trim_white(img: Image.Image) -> Image.Image:
    """Crop away plain white (or near-white) margins so the product fills its tile."""
    # Pixels more than 24 levels from white in any channel count as content
    mask = ImageChops.difference(img, Image.new("RGB", img.size, "white")).convert("L").point(lambda v: 255 if v > 24 else 0)
    box = mask.getbbox()
    if not box:
        return img
    pad = round(max(box[2] - box[0], box[3] - box[1]) * 0.03)  # keep a thin breathing margin
    box = (max(box[0] - pad, 0), max(box[1] - pad, 0), min(box[2] + pad, img.width), min(box[3] + pad, img.height))
    return img.crop(box) if box != (0, 0, img.width, img.height) else img


def save_image(url: str, path: Path, session: requests.Session) -> bool:
    if not url or not url.startswith("http"):
        return False
    try:
        r = session.get(url, headers=UA, timeout=20, stream=True)
        if r.status_code != 200:
            return False
        body = r.raw.read(MAX_BYTES + 1, decode_content=True)
        if len(body) > MAX_BYTES:
            return False
        img = Image.open(io.BytesIO(body))
        img.load()
    except Exception:  # bad URLs and undecodable files are both just a failed candidate
        return False
    if min(img.size) < MIN_SIDE or max(img.size) / min(img.size) > 3:
        return False
    if img.mode in ("RGBA", "LA", "P"):
        rgba = img.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, "white")
        canvas.paste(rgba, mask=rgba.getchannel("A"))
        img = canvas
    else:
        img = img.convert("RGB")
    if max(ImageStat.Stat(img.convert("L")).stddev) < 8:  # blank or single-colour
        return False
    img = trim_white(img)
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    img.save(path, "WEBP", quality=78, method=4)
    return True


def rank(results: list[dict], name_tokens: set[str], rejected: set[str]) -> list[tuple[float, dict]]:
    scored = []
    for d in results:
        host = urlparse(d.get("murl", "")).netloc.lower()
        if any(b in host for b in BLOCKED_HOSTS) or d.get("murl") in rejected:
            continue
        if UNSAFE.search(f"{d.get('t', '')} {d.get('purl', '')}"):
            continue
        words = tokens(f"{d.get('t', '')} {d.get('purl', '')} {d.get('murl', '')}")
        scored.append((len(name_tokens & words) / max(len(name_tokens), 1), d))
    return sorted(scored, key=lambda s: -s[0])  # stable, so Bing's order breaks ties


def fetch(job: tuple[str, dict, str | None], session: requests.Session) -> str:
    tid, item, shop_image = job
    path, meta = IMAGES / f"{tid}.webp", SOURCES / f"{tid}.json"
    if shop_image and save_image(shop_image, path, session):
        meta.write_text(json.dumps({"source": "retailer", "url": shop_image, "score": 1.0}))
        return "retailer"
    query = QUERIES.get(tid) or query_for(item)
    previous = load(meta) or {}
    rejected = {*previous.get("rejected", []), *([previous["url"]] if previous.get("url") else [])}
    results = search(query, session)
    for score, d in rank(results, tokens(query.removesuffix(" book cover").removesuffix(" toy")), rejected)[:12]:
        if save_image(d.get("murl"), path, session) or save_image(d.get("turl"), path, session):
            meta.write_text(json.dumps({"source": "search", "url": d.get("murl"), "page": d.get("purl"),
                                        "title": d.get("t"), "query": query, "score": round(score, 2),
                                        "rejected": sorted(rejected)}, ensure_ascii=False))
            return "search"
    return "none"


def trim_existing():
    """Trim white margins from photos saved before trimming was added."""
    changed = 0
    for path in sorted(IMAGES.glob("*.webp")):
        img = Image.open(path).convert("RGB")
        trimmed = trim_white(img)
        if trimmed.size != img.size:
            trimmed.save(path, "WEBP", quality=82, method=4)
            changed += 1
    print(f"trimmed {changed} of {len(list(IMAGES.glob('*.webp')))} photos")


def main():
    args = sys.argv[1:]
    if "--trim-existing" in args:
        return trim_existing()
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None
    redo = set(args[args.index("--redo") + 1:]) if "--redo" in args else set()
    if "--redo-queries" in args:
        redo |= {tid for tid in QUERIES if not (load(SOURCES / f"{tid}.json") or {}).get("query") == QUERIES[tid]}
    IMAGES.mkdir(parents=True, exist_ok=True)
    SOURCES.mkdir(parents=True, exist_ok=True)
    jobs, shop = [], {}
    for f in sorted((ROOT / "data" / "toys_raw").glob("*.json")):
        year = int(f.stem)
        for item in json.loads(f.read_text()):
            if item["is_product"]:
                tid = toy_id(year, item["name"])
                g = load(ROOT / "data" / "gathered" / f"{tid}.json") or {"pages": []}
                shop[tid] = pick_image(g["pages"])
                jobs.append((tid, item))
    # an image shared by several different toys is a shop logo/banner, not a product shot
    shared = {i for i, n in Counter(v for v in shop.values() if v).items() if n > 1}
    todo = [(tid, item, None if shop[tid] in shared or tid in redo else shop[tid]) for tid, item in jobs
            if tid in redo or not (SOURCES / f"{tid}.json").exists()]
    todo = list({j[0]: j for j in todo}.values())[:limit]
    print(len(jobs), "products;", len(todo), "to fetch", flush=True)
    session = requests.Session()
    counts = Counter()
    with ThreadPoolExecutor(6) as ex:
        for i, result in enumerate(ex.map(lambda j: fetch(j, session), todo)):
            counts[result] += 1
            if i % 100 == 0:
                print(i, dict(counts), flush=True)
    print("done", dict(counts), flush=True)
    print("missing:", [j[0] for j in jobs if not (IMAGES / f"{j[0]}.webp").exists()], flush=True)


if __name__ == "__main__":
    main()
