"""Step 1 — download RTÉ's official "Every toy from The Late Late Toy Show" pages
and convert each article body to plain text with links kept inline.

Output: raw_html/{year}.html, data/article_text/{year}.txt
"""
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
RAW = ROOT / "raw_html"
OUT = ROOT / "data" / "article_text"

SOURCES = {
    2017: "https://www.rte.ie/lifestyle/living/2017/1201/924176-toys-from-the-late-late-toy-show-2017-the-full-list/",
    2018: "https://www.rte.ie/lifestyle/living/2018/1130/1014423-every-toy-from-the-late-late-toy-show-2018/",
    2019: "https://www.rte.ie/lifestyle/living/2019/1129/1096011-every-toy-from-the-late-late-toy-show-2019/",
    2020: "https://www.rte.ie/lifestyle/living/2020/1127/1181000-every-toy-from-the-late-late-toy-show-2020/",
    2021: "https://www.rte.ie/lifestyle/living/2021/1126/1263163-every-toy-from-the-late-late-toy-show-2021/",
    2022: "https://www.rte.ie/lifestyle/living/2022/1125/1338295-every-toy-from-the-late-late-toy-show-2022/",
    2023: "https://www.rte.ie/lifestyle/living/2023/1124/1418297-every-toy-from-the-late-late-toy-show-2023/",
    2024: "https://www.rte.ie/lifestyle/living/2024/1206/1485079-every-toy-from-the-late-late-toy-show-2024/",
    2025: "https://www.rte.ie/lifestyle/living/2025/1205/1547511-every-toy-from-the-late-late-toy-show-2025/",
}



def body_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    body = soup.find(attrs={"itemprop": "articleBody"})
    for tag in body.find_all(["script", "style", "iframe", "cookie-consent-banner", "img", "figure"]):
        tag.decompose()
    for a in body.find_all("a"):
        href = a.get("href", "")
        a.replace_with(f"[{a.get_text(' ', strip=True)}]({href})" if href.startswith("http") else a.get_text(" ", strip=True))
    for br in body.find_all("br"):
        br.replace_with("\n")
    for b in body.find_all(["b", "strong", "h2", "h3"]):
        b.replace_with(f"## {b.get_text(' ', strip=True)}\n")
    text = "\n".join(p.get_text("", strip=False) for p in body.find_all(["p", "li", "h2", "h3"]) or [body])
    text = re.sub(r"[ \t\xa0]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n", text).strip()


def main():
    RAW.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for year, url in SOURCES.items():
        path = RAW / f"{year}.html"
        if not path.exists():
            r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
            r.raise_for_status()
            path.write_text(r.text)
        text = body_to_text(path.read_text())
        (OUT / f"{year}.txt").write_text(f"SOURCE: {url}\n\n{text}\n")
        print(year, len(text.splitlines()), "lines")


if __name__ == "__main__":
    main()
