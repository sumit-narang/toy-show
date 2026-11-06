"""Step 3 — gather raw material for each toy (no AI here):
  - retailer page metadata (og:image, og:description, JSON-LD product description)
  - YouTube candidate product videos (yt-dlp search)
  - per-year official Toy Show clips from the RTÉ "The Late Late Show" channel

Output: data/gathered/{toy_id}.json, data/show_clips/{year}.json
"""
import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from html import unescape
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "toys_raw"
OUT = ROOT / "data" / "gathered"
CLIPS = ROOT / "data" / "show_clips"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Accept-Language": "en-IE,en;q=0.9"}
OFFICIAL_CHANNELS = {"The Late Late Show", "RTÉ - IRELAND’S NATIONAL PUBLIC SERVICE MEDIA", "RTÉ", "RTÉ Archives", "RTÉ Player"}


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:80]


def toy_id(year: int, name: str) -> str:
    return f"{year}-{slug(name)}"


def yt_search(query: str, n: int) -> list[dict]:
    try:
        out = subprocess.run(
            ["yt-dlp", "--no-update", "--flat-playlist", "--print", "%(id)s\t%(channel)s\t%(duration)s\t%(title)s", f"ytsearch{n}:{query}"],
            capture_output=True, text=True, timeout=60,
        ).stdout
    except subprocess.TimeoutExpired:
        return []
    rows = []
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) == 4:
            vid, channel, dur, title = parts
            rows.append({"id": vid, "channel": channel, "duration": None if dur in ("NA", "None") else float(dur), "title": title})
    return rows


def page_meta(url: str | None) -> dict:
    if not url:
        return {"status": None}
    try:
        r = requests.get(url, headers=UA, timeout=15, allow_redirects=True)
    except requests.RequestException as e:
        return {"status": "error", "error": type(e).__name__}
    meta = {"status": r.status_code, "final_url": r.url}
    if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
        return meta
    soup = BeautifulSoup(r.text, "html.parser")

    def og(prop):
        tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
        return unescape(tag["content"]).strip() if tag and tag.get("content") else None

    meta.update(title=og("og:title") or (soup.title.string.strip() if soup.title and soup.title.string else None),
                description=og("og:description") or og("description"),
                image=og("og:image"))
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(s.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        for d in data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []:
            if isinstance(d, dict) and d.get("@type") == "Product":
                meta["ld_description"] = BeautifulSoup(str(d.get("description", "")), "html.parser").get_text(" ", strip=True)[:1500]
                meta["brand"] = (d.get("brand") or {}).get("name") if isinstance(d.get("brand"), dict) else d.get("brand")
                img = d.get("image")
                meta["ld_image"] = img[0] if isinstance(img, list) and img else img if isinstance(img, str) else None
    return meta


def gather(year: int, item: dict):
    tid = toy_id(year, item["name"])
    out = OUT / f"{tid}.json"
    if out.exists():
        return
    pages = [page_meta(r["url"]) for r in item["retailers"][:2]]
    videos = yt_search(item["name"], 5)
    out.write_text(json.dumps({"id": tid, "year": year, **item, "pages": pages, "video_candidates": videos}, indent=2, ensure_ascii=False))


def show_clips(year: int):
    out = CLIPS / f"{year}.json"
    if out.exists():
        return
    seen, clips = set(), []
    for q in (f"late late toy show {year}", f"toy show {year} RTÉ", f"late late toy show {year} toys"):
        for v in yt_search(q, 40):
            if v["id"] not in seen and v["channel"] in OFFICIAL_CHANNELS:
                seen.add(v["id"])
                clips.append(v)
    out.write_text(json.dumps(clips, indent=2, ensure_ascii=False))
    print(year, len(clips), "official clips")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    CLIPS.mkdir(parents=True, exist_ok=True)
    jobs = []
    for f in sorted(RAW.glob("*.json")):
        year = int(f.stem)
        jobs += [(year, it) for it in json.loads(f.read_text()) if it["is_product"]]
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(show_clips, sorted({y for y, _ in jobs})))
    print(len(jobs), "toys to gather")
    with ThreadPoolExecutor(12) as ex:
        for i, _ in enumerate(ex.map(lambda j: gather(*j), jobs)):
            if i % 100 == 0:
                print(i, flush=True)


if __name__ == "__main__":
    main()
