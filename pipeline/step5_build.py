"""Step 5 — merge everything into the frontend's data file.

Inputs:  data/toys_raw, data/gathered, data/described, data/show_clips, data/clip_matches
Output:  ../frontend/src/data/toys.json
"""
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from step1_fetch_lists import SOURCES
from step3_gather import toy_id

ROOT = Path(__file__).parent
DATA = ROOT / "data"
OUT = ROOT.parent / "frontend" / "src" / "data" / "toys.json"
IMAGES = ROOT.parent / "frontend" / "public" / "toys"

HOSTS = {**{y: "Ryan Tubridy" for y in range(2009, 2023)}, **{y: "Patrick Kielty" for y in range(2023, 2027)}}
KIND_CATEGORY = {"book": "Books", "game": "Board games & cards", "craft": "Arts & crafts", "outdoor": "Outdoor, sport & ride-ons", "tech": "Gaming & tech"}
BAD_IMAGE_HINTS = ("logo", "placeholder", "favicon", "default", "no-image", "noimage")


def load(path: Path):
    return json.loads(path.read_text()) if path.exists() else None


def is_product_page(url: str | None) -> bool:
    path = urlparse(url or "").path.rstrip("/")
    return bool(path) and not re.search(r"/(search|collections?|catalogsearch|category|shop)$", path)


def pick_image(pages: list[dict]) -> str | None:
    for p in pages:
        if p.get("status") != 200 or not is_product_page(p.get("final_url")):
            continue
        for img in (p.get("ld_image"), p.get("image")):
            if isinstance(img, dict):  # JSON-LD ImageObject
                img = img.get("url") or img.get("contentUrl")
            if isinstance(img, str) and img.startswith("http") and not any(h in img.lower() for h in BAD_IMAGE_HINTS):
                return img.replace("http://", "https://", 1)
    return None


def main():
    toys, years = [], {}
    for f in sorted((DATA / "toys_raw").glob("*.json")):
        year = int(f.stem)
        clips = load(DATA / "show_clips" / f"{year}.json") or []
        matches = load(DATA / "clip_matches" / f"{year}.json") or {"year_clips": [], "toy_clips": {}}
        clip_by_id = {c["id"]: c for c in clips}
        years[year] = {
            "source": SOURCES[year],
            "host": HOSTS.get(year),
            "clips": [{"id": c, "title": clip_by_id[c]["title"]} for c in matches["year_clips"] if c in clip_by_id],
        }
        seen = set()
        for item in json.loads(f.read_text()):
            if not item["is_product"]:
                continue
            tid = toy_id(year, item["name"])
            if tid in seen:
                continue
            seen.add(tid)
            g = load(DATA / "gathered" / f"{tid}.json") or {"pages": [], "video_candidates": []}
            d = load(DATA / "described" / f"{tid}.json") or {}
            vids = {v["id"]: v for v in g["video_candidates"]}
            pv = vids.get(d.get("product_video_id"))
            name = d.get("display_name") or item["name"]
            brand = d.get("brand")
            category = d.get("category") or KIND_CATEGORY.get(item["kind"], "Other")
            retailers = [r for r in item["retailers"] if r["name"]]
            toys.append({
                "id": tid,
                "year": year,
                "name": name,
                "brand": brand,
                "category": category,
                "ageRange": d.get("age_range"),
                "description": d.get("description"),
                "highlights": d.get("highlights", []),
                "confidence": d.get("confidence"),
                "priceEur": item["price_eur"],
                "priceText": item["price_text"],
                "irish": item["irish"],
                "retailers": retailers,
                "image": f"toys/{tid}.webp" if (IMAGES / f"{tid}.webp").exists() else None,
                "imageMatched": (load(DATA / "image_sources" / f"{tid}.json") or {}).get("source") == "search",
                "productVideo": {"id": pv["id"], "title": pv["title"], "channel": pv["channel"]} if pv else None,
                "showClips": [{"id": c, "title": clip_by_id[c]["title"], "channel": clip_by_id[c]["channel"]}
                              for c in matches["toy_clips"].get(tid, []) if c in clip_by_id],
                "source": SOURCES[year],
                "search": " ".join([name, item["name"], brand or "", category, str(year), *(r["name"] for r in retailers)]).lower(),
            })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"toys": toys, "years": years}, ensure_ascii=False, separators=(",", ":")))
    described = sum(1 for t in toys if t["description"])
    print(f"{len(toys)} toys across {len(years)} years · {described} described · "
          f"{sum(1 for t in toys if t['image'])} images · {sum(1 for t in toys if t['productVideo'])} product videos · "
          f"{sum(1 for t in toys if t['showClips'])} with show clips → {OUT}")


if __name__ == "__main__":
    main()
