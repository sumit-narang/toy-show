"""Step 2 — Claude turns each year's article text into structured toy records.

Output: data/toys_raw/{year}.json
Usage:  python step2_extract_toys.py [year ...]
"""
import json
import sys
from pathlib import Path
from typing import Literal, Optional

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict

ROOT = Path(__file__).parent
IN = ROOT / "data" / "article_text"
OUT = ROOT / "data" / "toys_raw"
load_dotenv(ROOT / ".env")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Retailer(Strict):
    name: str
    url: Optional[str]


class Item(Strict):
    name: str
    price_eur: Optional[float]
    price_text: Optional[str]
    retailers: list[Retailer]
    kind: Literal["toy", "game", "book", "craft", "outdoor", "tech", "other"]
    irish: bool
    is_product: bool


class YearList(Strict):
    items: list[Item]


PROMPT = """Below is RTÉ's official article listing every toy, game and book featured on The Late Late Toy Show {year}.
Extract every product listed. Rules:
- One item per distinct product. If the same product is listed twice with different retailers/prices, merge into one item with multiple retailers.
- name: the clean product name as listed (fix obvious typos, keep brand words, e.g. "LEGO Typewriter").
- price_eur: the euro price as a number if given (convert "€123,00" to 123.0). If only a £ price is given, leave price_eur null and keep it in price_text. "Starting at €75" -> 75.
- price_text: the price string as printed, or null.
- retailers: each named stockist with its link (null url if none). Use the visible shop name, not the product title in link text — e.g. "[FurReal Peanut | Smyths Toys Ireland](url)" -> name "Smyths Toys".
- kind: best fit category.
- irish: true if listed under an Irish toys/books section or clearly an Irish-made/Irish-designed product.
- is_product: false for things that are not buyable toys/games/books (e.g. a custom cake, bunting, a face painter, a shop's social page with no product, set decoration services). True otherwise.
- Section headings name the children who demoed toys — do NOT include children's names anywhere in your output.
- Do not invent products that are not in the text.

ARTICLE:
{text}"""


def extract(client, year: int) -> YearList:
    text = (IN / f"{year}.txt").read_text()
    with client.messages.stream(
        model="claude-opus-5-5",
        max_tokens=64000,
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": YearList.model_json_schema()}},
        messages=[{"role": "user", "content": PROMPT.format(year=year, text=text)}],
    ) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason != "end_turn":
        raise RuntimeError(f"{year}: stop_reason={msg.stop_reason}")
    body = next(b.text for b in msg.content if b.type == "text")
    return YearList.model_validate_json(body)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    years = [int(y) for y in sys.argv[1:]] or sorted(int(p.stem) for p in IN.glob("*.txt"))
    client = anthropic.Anthropic()
    for year in years:
        out = OUT / f"{year}.json"
        if out.exists() and len(sys.argv) == 1:
            print(year, "cached")
            continue
        result = extract(client, year)
        out.write_text(json.dumps(result.model_dump()["items"], indent=2, ensure_ascii=False))
        print(year, len(result.items), "items")


if __name__ == "__main__":
    main()
