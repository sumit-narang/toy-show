# Toy Show Archive

An unofficial archive of every toy, game and book featured on RTÉ's Late Late Toy Show, with a description, the price that year, where it was sold, and video clips.

The data runs from 2017 to 2025. Each year comes from RTÉ's official "Every toy from The Late Late Toy Show {year}" article, and the list of URLs is in `pipeline/step1_fetch_lists.py`.

## Pipeline (`pipeline/`)

The pipeline runs locally and writes `frontend/src/data/toys.json`. It needs `ANTHROPIC_API_KEY` in `pipeline/.env`, plus `yt-dlp` on your PATH.

```
cd pipeline
python3 -m venv .venv && .venv/bin/pip install anthropic pydantic requests python-dotenv beautifulsoup4
.venv/bin/python step1_fetch_lists.py     # RTÉ article -> data/article_text/{year}.txt
.venv/bin/python step2_extract_toys.py    # Claude -> data/toys_raw/{year}.json (name, price, retailers, Irish?)
.venv/bin/python step2b_parse_offline.py 2017 2022  # optional: rule-based step 2 for years with no data, needs no API credit
.venv/bin/python step3_gather.py          # retailer og/JSON-LD metadata + YouTube candidates -> data/gathered/
.venv/bin/python step3b_date_clips.py     # official RTÉ clips, dated by upload -> data/show_clips/{year}.json
.venv/bin/python step3c_match_clips.py    # curate year clips + link toy segments -> data/clip_matches/
.venv/bin/python step3d_images.py         # download a photo for every toy -> ../frontend/public/toys/ (needs Pillow)
.venv/bin/python step4_describe.py        # Claude: description, brand, category, age, product video pick
.venv/bin/python step5_build.py           # merge -> ../frontend/src/data/toys.json
```

Every step caches its output, so a rerun only does the missing work. Two more things about the data:

- The children's names in RTÉ's section headings are deliberately left out.
- The toy-segment keywords in `step3c_match_clips.py` were picked by hand from the clip titles.

Some outputs aren't in the repo. Step 1 re-downloads the RTÉ article copies (`raw_html/`, `data/article_text/`), which are left out because they contain children's names. `step3d_images.py` re-downloads the toy photos (`frontend/public/toys/`), which are left out because they come from other sites. `data/image_sources/` records where each photo came from, so a rerun fetches the same ones. Run step 3d before building the frontend, or the site falls back to video thumbnails and placeholders.

## Frontend (`frontend/`)

React + Vite + Tailwind. It's served at `/toy-show/` (see `base` in `vite.config.js` and `basename` in `main.jsx`).

```
cd frontend && npm install && npm run dev
```

`.npmrc` sets `legacy-peer-deps`, which works around an npm 10.8 bug that otherwise breaks the install with "Cannot read properties of null (reading 'edgesOut')".

When the 2026 show airs, add its RTÉ article URL to `SOURCES` in `step1_fetch_lists.py` and rerun the pipeline.
