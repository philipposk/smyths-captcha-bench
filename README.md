# smyths-captcha-bench

Live dashboard at **[4.6x7.gr](https://4.6x7.gr)** ranking free/local vision models on the
Smyths captcha-solving task.

Every candidate model (and combo) is run over the **same** saved puzzles and scored on:

- **solve** — every icon in the puzzle clicked correctly
- **locate** — fraction of icons hit
- **legend** — icon names read correctly
- **p50** — median time per puzzle
- **$/1k** — estimated cost per 1,000 puzzles (local models = $0)

## How it's published

This repo is a static [GitHub Pages](https://pages.github.com/) site. It carries **no secrets and
no raw site data** — only `data/results.json`, which the bench writes locally and pushes here.

The bench lives in the scraper repo:

```bash
# in smyths-scraper, after collecting a corpus (CAPTCHA_DUMP_DIR)
BENCH_OUT_DIR=/path/to/smyths-captcha-bench node bin/bench-solve.js
git -C /path/to/smyths-captcha-bench commit -am "bench: update results" && git push
```

`index.html` polls `data/results.json` every 60s, so the page updates as new data lands.
