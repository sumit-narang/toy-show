"""Step 4 — Claude writes each toy's details from the gathered material and picks
a product video from the YouTube candidates (or none).

Output: data/described/{toy_id}.json
"""
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Literal, Optional

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict

ROOT = Path(__file__).parent
IN = ROOT / "data" / "gathered"
OUT = ROOT / "data" / "described"
load_dotenv(ROOT / ".env")
BATCH = 15

CATEGORIES = Literal[
    "Interactive pets & robots", "LEGO & building", "Dolls & fashion", "Plush & soft toys",
    "Board games & cards", "Puzzles", "Books", "Arts & crafts", "Science & STEM",
    "Vehicles & remote control", "Action figures & playsets", "Pretend play", "Music & dance",
    "Baby & toddler", "Outdoor, sport & ride-ons", "Gaming & tech", "Other",
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Described(Strict):
    id: str
    display_name: str
    brand: Optional[str]
    category: CATEGORIES
    age_range: Optional[str]
    description: str
    highlights: list[str]
    product_video_id: Optional[str]
    confidence: Literal["high", "medium", "low"]


class Batch(Strict):
    toys: list[Described]


PROMPT = """You are writing entries for a fan archive of toys featured on RTÉ's Late Late Toy Show (Ireland).
For each toy below you get: the name as RTÉ listed it, the year, its retailer page metadata (may be missing or stale), and YouTube search results for the name.

For each toy return:
- id: copy exactly.
- display_name: tidy product name (proper capitalisation, brand first where natural). Don't change what the product is.
- brand: manufacturer/brand if known from the material or unambiguous from the name (e.g. "LEGO", "Hasbro", "Spin Master"); else null.
- category: best fit.
- age_range: e.g. "3+", "6–10" only if stated in the material or the brand's standard labelling is well known; else null.
- description: 2–3 friendly, factual sentences on what the toy is and how kids play with it. Base it on the retailer material and widely-known facts about the product. Never invent specific specs, prices, awards, or sales claims. If you know little, keep it short and general rather than guessing. No mention of the children on the show.
- highlights: 0–3 short feature phrases (≤6 words each), only ones supported by the material or well-known.
- product_video_id: the id of ONE candidate video that clearly shows THIS exact product (a demo, review, unboxing or official ad). Prefer official brand channels and short videos. Return null if no candidate clearly matches — a wrong video is worse than none.
- confidence: high if retailer material confirmed what it is; medium if from well-known product knowledge; low if mostly inferred from the name.

TOYS:
{toys}"""


def compact(g: dict) -> dict:
    pages = [{k: p.get(k) for k in ("title", "description", "ld_description", "brand") if p.get(k)} for p in g["pages"]]
    return {
        "id": g["id"], "year": g["year"], "name": g["name"], "kind": g["kind"], "irish": g["irish"],
        "retailers": [r["name"] for r in g["retailers"]],
        "retailer_pages": [p for p in pages if p],
        "video_candidates": [{k: v[k] for k in ("id", "channel", "title", "duration")} for v in g["video_candidates"]],
    }


def run_batch(client, items: list[dict]):
    with client.messages.stream(
        model="claude-opus-5-5",
        max_tokens=32000,
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": Batch.model_json_schema()}},
        messages=[{"role": "user", "content": PROMPT.format(toys=json.dumps([compact(g) for g in items], ensure_ascii=False))}],
    ) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason != "end_turn":
        print("skip batch:", msg.stop_reason, items[0]["id"])
        return
    valid = {g["id"]: {v["id"] for v in g["video_candidates"]} for g in items}
    for d in Batch.model_validate_json(next(b.text for b in msg.content if b.type == "text")).toys:
        if d.id not in valid:
            continue
        if d.product_video_id not in valid[d.id]:
            d.product_video_id = None
        (OUT / f"{d.id}.json").write_text(json.dumps(d.model_dump(), indent=2, ensure_ascii=False))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    todo = [json.loads(f.read_text()) for f in sorted(IN.glob("*.json")) if not (OUT / f.name).exists()]
    batches = [todo[i:i + BATCH] for i in range(0, len(todo), BATCH)]
    print(len(todo), "toys in", len(batches), "batches")
    client = anthropic.Anthropic()

    def safe(b):
        try:
            run_batch(client, b)
        except Exception as e:  # keep going; rerun picks up missing ids
            print("batch failed:", b[0]["id"], type(e).__name__, e)

    with ThreadPoolExecutor(6) as ex:
        list(ex.map(safe, batches))
    print(len(list(OUT.glob("*.json"))), "described")


if __name__ == "__main__":
    main()
