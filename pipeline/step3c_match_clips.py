"""Step 3c — curate which official clips appear for each year, and link the
toy-demo segments to toys of that year by keyword (hand-picked from clip titles).

Output: data/clip_matches/{year}.json  {"year_clips": [ids], "toy_clips": {toy_id: [ids]}}
"""
import json
import re

from step3_gather import CLIPS, ROOT, toy_id

OUT = ROOT / "data" / "clip_matches"

# Uploads that aren't from the Toy Show itself (regular Late Late Show, trailers for other programmes)
EXCLUDE = {"vbNU0nQ5iLY", "ih-oXFoGzbo", "PIz4mhgFX3I", "aYaEinxakXI", "xNpaQ5VnboQ", "-CtAs-4SBEw", "taT889_-r2w", "flbMl7tLVTM"}

# clip id -> regex matched against toy names from the same year
TOY_SEGMENTS = {
    "vbjCno5stvc": r"slime",
    "kiB6_mwioVE": r"back to the future|delorean",
    "oOwYVPusFIA": r"star wars",
    "U2Q8oLFEOIY": r"dino|t-?rex|jurassic",
    "16x-8FoT3k8": r"\blego\b",
    "oxLojYQVey8": r"barbie",
    "_3O_eDw5X7E": r"ride[- ]?on|electric car|quad|tractor",
    "wVAWrjBVrig": r"sylvanian|football",
    "zLpcp-Qolgw": r"labubu|hot ?wheels|stunt|scooter",
    "d9cSMjoC37Y": r"minecraft|nintendo|switch|playstation|ps5|xbox|video game",
    "ZXU_07kvnZs": r"pet hospital|vet",
    "IKQk6kwkH8c": r"spy|gymnastic",
    "Zh17SfQwDwM": None,  # book segment: matched by kind instead
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for f in sorted(CLIPS.glob("*.json")):
        year = int(f.stem)
        clips = [c for c in json.loads(f.read_text()) if c["id"] not in EXCLUDE]
        titles = {c["title"].replace("ISL ", "").replace("ISL - ", "").replace("ISL: ", "") for c in clips if not c["title"].startswith("ISL")}
        year_clips = [c["id"] for c in clips if not c["title"].startswith("ISL") or c["title"].split(" ", 1)[1].lstrip("-: ") not in titles]
        raw = ROOT / "data" / "toys_raw" / f"{year}.json"
        toys = json.loads(raw.read_text()) if raw.exists() else []
        toy_clips = {}
        for c in clips:
            if c["id"] not in TOY_SEGMENTS:
                continue
            pattern = TOY_SEGMENTS[c["id"]]
            for t in toys:
                hit = t["kind"] == "book" if pattern is None else re.search(pattern, t["name"], re.I)
                if t["is_product"] and hit:
                    toy_clips.setdefault(toy_id(year, t["name"]), []).append(c["id"])
        (OUT / f"{year}.json").write_text(json.dumps({"year_clips": year_clips, "toy_clips": toy_clips}, indent=2))
        print(year, len(year_clips), "clips,", len(toy_clips), "toys linked")


if __name__ == "__main__":
    main()
