# Deploying the Deda storefront to Cloudflare Pages

The VPS still hosts the API + Postgres + uploads at
`https://dedawomenswear.shop`. Cloudflare Pages adds an edge-delivered
copy of the Next.js storefront on top — visitors hit the Cloudflare
URL, that fetches data from the VPS via the public API.

## 1. Cloudflare Pages — first-time project setup

In the Cloudflare dashboard → **Workers & Pages** → **Create** →
**Pages** → **Connect to Git**, point at `managementEdaraPro/B-A`.

**Build settings:**

| Field | Value |
|---|---|
| Production branch | `main` |
| Framework preset | `Next.js` |
| Build command | `cd frontend && npm install && npm run pages:build` |
| Build output directory | `frontend/.vercel/output/static` |
| Root directory | _(leave empty — repo root)_ |
| Node version | `22` (env var `NODE_VERSION=22`) |

**Compatibility flag** (Settings → Functions): `nodejs_compat`
(set for both Production and Preview).

## 2. Environment variables (Cloudflare Pages dashboard)

Production + Preview, same values:

```
NEXT_PUBLIC_API_URL          = https://dedawomenswear.shop
NEXT_INTERNAL_API_URL        = https://dedawomenswear.shop
NEXT_PUBLIC_SITE_URL         = https://<your-cloudflare-url>
NEXT_PUBLIC_FB_PIXEL_ID      = (leave empty until you have one)
NEXT_PUBLIC_TIKTOK_PIXEL_ID  = (leave empty until you have one)
```

`<your-cloudflare-url>` is whatever Cloudflare assigns (typically
`https://deda.pages.dev` or `https://deda-<hash>.pages.dev` if the
default project name is taken).

## 3. Backend CORS — add the new origin

On the VPS, edit `/opt/deda/repo/.env`:

```bash
CORS_ORIGINS=https://dedawomenswear.shop,https://deda.pages.dev
```

Comma-separated, no spaces. Then rebuild the API:

```bash
cd /opt/deda/repo
bash scripts/deploy.sh
```

## 4. Deploy

Push to `main`. Cloudflare Pages picks the push up automatically and
runs the build. The first build takes ~3–4 minutes; subsequent ones
are faster because of dependency cache.

## 5. Sanity checks after the first successful deploy

```bash
curl -sI https://deda.pages.dev/                | head -3   # expect 307 → /en
curl -s  https://deda.pages.dev/api/health                  # 404 — api stays on the VPS, this is fine
curl -s  https://deda.pages.dev/en | grep -i deda | head -2
```

Then open `https://deda.pages.dev/en` in a browser, add an item to
cart, fill the checkout form — the order should land in the VPS
admin at `https://dedawomenswear.shop/admin/orders` like any other.

## 6. Custom domain (later)

Cloudflare Pages → Project → Custom domains → Set up the domain you
own. Update `NEXT_PUBLIC_SITE_URL` to match and bump `CORS_ORIGINS`
on the VPS again.

## Notes / gotchas

- Every dynamic page now exports `runtime = 'edge'` so it can run on
  Cloudflare Workers. If we add a new dynamic route we have to remember
  to set it too — `next-on-pages` will fail the build otherwise.
- Admin routes (`/admin/*`) still work from the Cloudflare URL. The
  JWT is stored in localStorage per-origin, so logging in at the VPS
  origin doesn't carry over to the Cloudflare origin.
- The VPS frontend container (`deda_web`) is still running and reachable
  at `https://dedawomenswear.shop`. Either keep it as a fallback or
  scale it down later with `docker compose stop web`.
