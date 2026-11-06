"""Step 2b — rule-based alternative to step 2 that needs no API credit.

Parses RTÉ's article text into the same records as step 2. Its kind and Irish
flags are keyword guesses, so they're less precise than Claude's. It won't replace
a file step 2 wrote; pass --force to overwrite its own earlier output.

Output: data/toys_raw/{year}.json
Usage:  python step2b_parse_offline.py [--force] [--dry-run] year ...
"""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent
IN = ROOT / "data" / "article_text"
OUT = ROOT / "data" / "toys_raw"
MARKER = ROOT / "data" / "toys_raw_offline_years.json"

LINK = re.compile(r"\[([^\]]*)\]\(([^)]*)\)")
PRICE = r"[€£]\s?\d[\d,]*(?:\.\d+)?\+?"
# Sections that credit suppliers or list prizes rather than products
SKIP_SECTION = re.compile(r"^(prizes|helmets provided|selection of helmets|ncbi|watch the late late)", re.I)
# Lines that are prose or credits rather than a product
SKIP_LINE = re.compile(r"^(SOURCE:|Another Toy Show|Did your little|Every year, toys|Old toys kindly|You may also"
                       r"|Safety Equipment|Selection of helmets)", re.I)
NOT_PRODUCT = re.compile(r"own toy\)|real car|smoke machine|stage light|custom cake|bunting|face paint(er|ing)\b"
                         r"|^cl[ií]ona.s foundation", re.I)
# Children's names that appear inside product lines; names must stay out of the data
CHILD_PREFIX = re.compile(r"^(?:Daniel wore an? |Jeremiah: )")

KIND_RULES = [
    ("book", r"\bbooks?\b|encyclopedia|\bby [A-Z]|annual\b|\bnovel\b|storybook"),
    ("game", r"board ?game|card game|\bgame\b|monopoly|cluedo|\bchess\b|uno\b|twister|jenga|match attax"),
    ("tech", r"nintendo|xbox|x box|playstation|\bps[45]\b|switch\b|\btablet\b|\bconsole\b|\bdrone\b|\bcamera\b|\brobot|\bcoding\b|walkie"),
    ("outdoor", r"ride[- ]?on|scooter|\bbike\b|bicycle|trampoline|\bquad\b|tractor|go[- ]?kart|skateboard|football|hurl|rebounder|\bslide\b|swing|helmet|12v|24v"),
    ("craft", r"craft|paint|slime|\bbeads?\b|loom|colou?ring|sticker|jewell?ery|play-?doh|sewing|knit|draw"),
]
IRISH = re.compile(r"\birish\b|\bgaa\b|hurl|sliotar|camogie|gaeilge|\bcroke park\b|skellig|wild atlantic|ireland\b", re.I)
IRISH_MAKERS = re.compile(r"redrufus|lottie\.com|arckit|fairydoor|seanog|piecesofgreat|bainisteoir|wonkywoolins|lucyandme"
                          r"|dlulukaloo|supportelf|footybuckets|myforevertoothfairy|izzywheels|gaaboardgames", re.I)


def clean_url(url: str) -> str | None:
    url = url.replace("&amp;", "&").replace("http:// ", "").replace(" ", "").strip()
    if not url.startswith("http"):
        url = f"https://{url}"
    host = urlparse(url).netloc
    return url if "." in host and "'" not in host else None


def shop_from_broken_url(url: str) -> str | None:
    """'http://O'Mahonys.ie' isn't a usable link, but it still names the shop."""
    host = re.sub(r"^https?://(www\.)?", "", url.strip()).split("/")[0]
    return host if "." in host else None


def shop_from_url(url: str | None) -> str | None:
    if not url:
        return None
    host = urlparse(url).netloc.removeprefix("www.")
    return host or None


def tidy_shop(name: str) -> str:
    name = re.sub(r"(?<=[a-z])for$", "", name.strip())  # 'Buy it from Penneysfor €5'
    return re.sub(r"\s+", " ", name).strip(" .-–,/")


def split_shops(text: str) -> list[str]:
    return [tidy_shop(s) for s in re.split(r"\s*/\s*|\s+and\s+|\s*,\s*", text) if tidy_shop(s)]


def parse_price(text: str) -> tuple[float | None, str | None]:
    """Prefer the current price in 'Was €X Now €Y'; only euro prices fill price_eur."""
    now = re.search(rf"now\s*({PRICE})", text, re.I)
    found = now.group(1) if now else None
    if not found:
        m = re.search(PRICE, text)
        found = m.group(0) if m else None
    if not found:
        m = re.search(r"\$\s?\d+(?:\.\d+)?", text) or re.search(r"[-–]\s*(\d+\.\d{2})\s*$", text)
        if m:
            return (float(m.group(1)), f"€{m.group(1)}") if m.lastindex else (None, m.group(0))
        return None, None
    # '€123,00' is a decimal comma; '€1,200' is a thousands separator
    digits = re.sub(r",(\d{2})\b", r".\1", found).replace(",", "")
    num = float(re.sub(r"[^\d.]", "", digits))
    return (num if found.startswith("€") else None), found


def classify(name: str, section: str) -> str:
    if re.search(r"\bbooks?\b", section, re.I):
        return "book"
    for kind, pattern in KIND_RULES:
        if re.search(pattern, name, re.I if kind != "book" else 0):
            return kind
    return "toy"


def clean_name(name: str) -> str:
    name = re.sub(r"\s*\0\s*", " ", name)
    name = re.sub(r"\s+Search\b.*$", "", name)  # copied from a shop's search page
    name = re.sub(r"\s+RRP$", "", name.strip(), flags=re.I)
    name = re.sub(r"\s*-+\s*#+.*$", "", name)
    name = CHILD_PREFIX.sub("", name)
    name = re.sub(r"\s+", " ", name).strip(" -–:,#")
    name = re.sub(r"\s+(?:and|for)$", "", name)
    # shop-page titles often repeat themselves: "Grabolo Grabolo", "X Y X Y X Y"
    while (m := re.fullmatch(r"(.{3,}?)(?: \1)+", name)):
        name = m.group(1)
    return re.sub(r"^(\S{3,}) \1\b", r"\1", name)


def parse_line(line: str, section: str, section_shop: dict | None) -> dict | None:
    line = re.sub(r"\[([^\]]*)\]\(([^)]*)\)\[(\.[a-z]+)\]\(\2\)", r"[\1\3](\2)", line)  # '[littleones](u)[.ie](u)'
    line = re.sub(r"^Ryan's Vespa ride is from", "Vespa Ride-On - ", line)
    links = [(t.strip(), clean_url(u)) for t, u in LINK.findall(line)]
    broken = next((shop_from_broken_url(u) for _, u in LINK.findall(line) if not clean_url(u)), None)
    plain = LINK.sub(lambda m: m.group(1), line)
    price_eur, price_text = parse_price(plain)
    retailers, name = [], None

    buy = re.search(r"\s*[-–]?\s*(?:Buy (?:it|the children's version) ?(?:from|at)?|Get it (?:from|at)|Available (?:from|to purchase from))"
                    r"\s*(.*?)(?:\s+(?:for|starting|from|bill pay)\b.*|\s*[€£$].*)?$", plain, re.I)
    provided = re.search(r"\s*[-–]?\s*provided by\s+(.*)$", plain, re.I)
    if buy or provided:
        match = buy or provided
        name = plain[:match.start()]
        shops = split_shops(re.sub(r"^the\s+", "", match.group(1), flags=re.I))
        by_text = {t.lower(): u for t, u in links}
        retailers = [{"name": s, "url": by_text.get(s.lower()) or next((u for t, u in links if t and t.lower() in s.lower()), None)}
                     for s in shops]
    else:
        # Everything left after removing the links and prices is the product name
        rest = LINK.sub(" \0 ", line)
        rest = re.sub(rf"\(?\b(?:was|now)\s*{PRICE}\)?", " ", rest, flags=re.I)
        rest = re.sub(PRICE, " ", rest)
        rest = re.sub(r"(?:^|\s)starting at\s*", " ", rest, flags=re.I)
        rest = re.sub(r"[-–]\s*\d+\.\d{2}\s*$", " ", rest)
        before = rest.split("\0")[0]
        if before.strip(" -––:") and links:
            name = before
            retailers = [{"name": t or shop_from_url(u), "url": u} for t, u in links]
        elif links:  # '[Product](url) - €9' — the link text is the product, the shop is the domain
            name = links[0][0]
            u = links[0][1]
            shop = shop_from_url(u) or broken
            retailers = [{"name": shop, "url": u}] if shop else []
        else:
            name = rest

    name = clean_name(name or "")
    if not name or not re.search(r"[A-Za-z]", name):
        return None
    if section_shop and not retailers:
        retailers = [section_shop]
    for r in retailers:
        r["name"] = tidy_shop(r["name"] or "") or None
    retailers = [r for r in retailers if r["name"]]
    urls = " ".join(r["url"] or "" for r in retailers)
    return {
        "name": name,
        "price_eur": price_eur,
        "price_text": price_text,
        "retailers": retailers,
        "kind": classify(name, section),
        "irish": bool(re.search(r"\birish\b", section, re.I) or IRISH.search(name) or IRISH_MAKERS.search(urls)),
        "is_product": not NOT_PRODUCT.search(line),
    }


def parse(text: str) -> list[dict]:
    items, by_name, section, section_shop = [], {}, "", None
    # RTÉ's 2025 article splits one product across two lines at a stray heading mark
    text = re.sub(r"-\s*##\s*\n", "- ", text)
    for raw in text.splitlines():
        line = raw.strip()
        if not line or SKIP_LINE.match(line):
            continue
        if line.startswith("## "):
            head = line[3:].strip()
            m = LINK.fullmatch(head)
            section = m.group(1) if m else head
            url = clean_url(m.group(2)) if m else None
            section_shop = {"name": section, "url": url} if m else None
            continue
        if SKIP_SECTION.match(section):
            continue
        if LINK.fullmatch(line) and not re.search(r"product|/p/", LINK.fullmatch(line).group(2)):
            continue  # a bare shop credit, not a product
        item = parse_line(line, section, section_shop)
        if not item:
            continue
        key = re.sub(r"[^a-z0-9]+", "", item["name"].lower())
        if key in by_name:  # same product listed twice: keep one record with every stockist
            have = by_name[key]
            have["retailers"] += [r for r in item["retailers"] if r not in have["retailers"]]
            continue
        by_name[key] = item
        items.append(item)
    return items


def main():
    args = sys.argv[1:]
    force, dry = "--force" in args, "--dry-run" in args
    years = [int(a) for a in args if a.isdigit()]
    offline = set(json.loads(MARKER.read_text())) if MARKER.exists() else set()
    for year in years:
        out = OUT / f"{year}.json"
        if out.exists() and not (force and year in offline):
            print(year, "already has data; skipped")
            continue
        items = parse((IN / f"{year}.txt").read_text())
        if dry:
            print(json.dumps(items, indent=0, ensure_ascii=False))
            continue
        out.write_text(json.dumps(items, indent=2, ensure_ascii=False))
        offline.add(year)
        print(year, len(items), "items")
    if not dry:
        MARKER.write_text(json.dumps(sorted(offline)))


if __name__ == "__main__":
    main()
