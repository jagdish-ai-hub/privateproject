# Caching

**What it is:** keeping a copy of data you already downloaded so you do not download it again.

**Why it matters here:** MFapi is a free service with rate limits. A fund's NAV history only ever
gets one new row per day, so downloading all ~8,500 histories every night would be wasteful and
would hit the limits.

## What is cached today

| Layer | What | Where |
| --- | --- | --- |
| NAV history per scheme | The full cleaned-input series | `data/cache/nav/{code}.json.gz` (one gzip file per scheme) |
| AMFI file and MFapi scheme list | For `--offline` development runs | `data/cache/NAVAll.txt`, `data/cache/mf-list.json` |
| Browser | Nothing special: static files are cached by the host/CDN | |

How a run uses the cache (`getHistory` in `scripts/pipeline/history.ts`):

1. No cache for a scheme: download its full history once and store it.
2. Cache is current or 1 to 5 days behind: append AMFI's latest NAV. **No API call.**
3. Cache is further behind: download only the missing days (`?startDate=`).

So after the first run (about 10 minutes for ~8,500 schemes) a nightly run makes **two** API calls
in total (NAVAll.txt and the scheme list) and finishes in about 20 seconds.

In GitHub Actions the folder `data/cache` is saved and restored with `actions/cache`
(`.github/workflows/nightly.yml`).

## Swapping the storage

The pipeline only talks to the `HistoryStore` interface:

```ts
interface HistoryStore {
  get(code: number): Promise<NavSeries | null> | NavSeries | null;
  set(code: number, series: NavSeries): Promise<void> | void;
}
```

`FileHistoryStore` (default) and `MemoryHistoryStore` (tests) implement it. To use S3 / Cloudflare R2 /
Redis / a database, write one class with `get` and `set` and change the single line in
`scripts/build-data.ts`:

```ts
const store = new FileHistoryStore(`${CACHE_DIR}/nav`);   // ← replace
```

Nothing else changes.

## Staying under the rate limit

- `--rps=10` (default) spaces requests at least 100 ms apart across all workers; `--concurrency=5`
  caps parallel requests.
- On HTTP 429 the client waits for the `Retry-After` header (max 60 s), otherwise backs off
  exponentially, and retries up to 4 times.
- A failed scheme does not stop the run; it is counted in `report.json` and retried next night.
