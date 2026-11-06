"""Step 3b — build one pool of official Toy Show clips, dated by upload date,
and assign each to a show year (uploads from Nov of year Y to Jan of Y+1).
Pass years to update only those files, e.g. `python step3b_date_clips.py 2025`.

Output: data/show_clips/{year}.json (overwrites step 3's per-year search results)
"""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

from step1_fetch_lists import SOURCES
from step3_gather import CLIPS, OFFICIAL_CHANNELS, yt_search


def upload_date(vid: str) -> str | None:
    out = subprocess.run(
        ["yt-dlp", "--no-update", "--skip-download", "--print", "%(upload_date)s", f"https://www.youtube.com/watch?v={vid}"],
        capture_output=True, text=True, timeout=90,
    ).stdout.strip()
    return out if out.isdigit() else None


def show_year(date: str) -> int | None:
    y, m = int(date[:4]), int(date[4:6])
    if m >= 11:
        return y
    if m == 1:
        return y - 1
    return None


def main():
    years = [int(a) for a in sys.argv[1:]] or list(SOURCES)
    queries = [q.format(y=y) for y in years for q in (
        "late late toy show {y}", "toy show {y} RTÉ", "late late toy show {y} toys", "late late toy show {y} demo")]
    queries += ["late late toy show toy demo", "late late toy show lego", "late late toy show toys review kids"]
    pool = {}
    with ThreadPoolExecutor(6) as ex:
        for results in ex.map(lambda q: yt_search(q, 50), queries):
            for v in results:
                if v["channel"] in OFFICIAL_CHANNELS:
                    pool[v["id"]] = v
    print(len(pool), "official clips; dating…")
    with ThreadPoolExecutor(8) as ex:
        for v, d in zip(pool.values(), ex.map(upload_date, pool)):
            v["upload_date"] = d
    by_year = {y: [] for y in years}
    for v in pool.values():
        y = show_year(v["upload_date"]) if v["upload_date"] else None
        if y in by_year:
            by_year[y].append(v)
    for y, clips in by_year.items():
        clips.sort(key=lambda v: v["upload_date"])
        (CLIPS / f"{y}.json").write_text(json.dumps(clips, indent=2, ensure_ascii=False))
        print(y, len(clips))


if __name__ == "__main__":
    main()
