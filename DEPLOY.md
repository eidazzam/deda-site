# Deploying Deda to the Hostinger VPS

The storefront lives at `https://dedawomenswear.shop` and is served by the
host Nginx that already terminates SSL for the other projects on this
box. We add Deda as another upstream alongside `hindam`, `tecnosystem`,
and `egytrans` — no new Nginx container.

## Topology

```
internet : 443 (host Nginx, SSL via Let's Encrypt)
    │
    └── dedawomenswear.shop
            ├── /              → 127.0.0.1:3020   (deda_web — Next.js)
            ├── /api/*         → 127.0.0.1:3021   (deda_api — Fastify)
            └── /uploads/*     → /opt/deda/uploads   (static, alias)

docker network "deda":
    deda_postgres   (5432 internal · 127.0.0.1:5434 on host)
    deda_api        (3001 internal · 127.0.0.1:3021 on host)
    deda_web        (3000 internal · 127.0.0.1:3020 on host)
```

## One-time setup

Run from a fresh `root@srv1114905` shell on the VPS.

```bash
# 1. Folders
mkdir -p /opt/deda/{data/postgres,uploads,backups}
cd /opt/deda

# 2. Clone (uses a GitHub PAT; rotate the token after this step)
git clone https://EdaraPro7:<PAT>@github.com/managementEdaraPro/B-A.git repo
cd repo

# 3. Env
cp .env.production.example .env
nano .env       # fill in passwords + DuckDNS token

# 4. Nginx — bootstrap config first (HTTP only, satisfies the ACME challenge)
cp nginx/dedawomenswear.shop.bootstrap.conf /etc/nginx/sites-available/dedawomenswear.shop
ln -sf /etc/nginx/sites-available/dedawomenswear.shop /etc/nginx/sites-enabled/dedawomenswear.shop
nginx -t && systemctl reload nginx

# 5. TLS — webroot mode so certbot doesn't touch our Nginx config
mkdir -p /var/www/html/.well-known/acme-challenge
certbot certonly --webroot -w /var/www/html -d dedawomenswear.shop \
        --agree-tos --no-eff-email -m you@example.com -n

# 6. Swap in the full HTTPS-aware config now that the cert exists
cp nginx/dedawomenswear.shop.conf /etc/nginx/sites-available/dedawomenswear.shop
nginx -t && systemctl reload nginx

# 7. First deploy (builds images, migrates, seeds, starts everything)
chmod +x scripts/deploy.sh scripts/backup.sh scripts/restore.sh
bash scripts/deploy.sh

# 8. Sanity checks
curl -s https://dedawomenswear.shop/api/products | head -c 200
curl -s https://dedawomenswear.shop/api/governorates | head -c 200
curl -sI https://dedawomenswear.shop/ | head -1

# 9. Weekly backup cron
crontab -l 2>/dev/null > /tmp/cron.bak
echo "0 3 * * 0 /opt/deda/repo/scripts/backup.sh >> /var/log/deda-backup.log 2>&1" >> /tmp/cron.bak
crontab /tmp/cron.bak && rm /tmp/cron.bak
```

## Routine updates

```bash
cd /opt/deda/repo
bash scripts/deploy.sh
```

This pulls main, rebuilds api + web images, runs Prisma migrations
(`migrate deploy` — never destructive), and rolls the containers.
Seed only runs the very first time, gated by the `.seeded` marker.

## Logs

```bash
# Tail live
docker compose -f /opt/deda/repo/docker-compose.yml logs -f api
docker compose -f /opt/deda/repo/docker-compose.yml logs -f web

# Last 200 lines
docker compose -f /opt/deda/repo/docker-compose.yml logs --tail 200 api
```

## Backups + restore

Dumps land in `/opt/deda/backups/` once a week, kept for 60 days.
The script also tars `uploads/` alongside each dump.

```bash
# Manual dump anytime
bash /opt/deda/repo/scripts/backup.sh

# Restore a specific dump (wipes current data — read the prompt!)
bash /opt/deda/repo/scripts/restore.sh /opt/deda/backups/deda_YYYY-MM-DD_HHMM.sql.gz
```

## Rotating secrets

* **Admin password** — edit `.env`, `docker compose up -d --force-recreate api`.
* **JWT secret** — same. Existing admin sessions will be invalidated;
  log in again.

## Troubleshooting

| Symptom | First place to look |
| --- | --- |
| 502 Bad Gateway from Nginx | `docker compose ps` — api or web is down. `docker compose logs api` |
| Storefront loads but no products | `curl localhost:3021/api/products` from the VPS — DB or seed issue |
| Admin login returns 401 every time | `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` and the container — restart api after env changes |
| Uploads fail mid-upload | Nginx `client_max_body_size 6m` + sharp 5MB limit. Check `docker compose logs api` |
| Cert renewal fails | `certbot renew --dry-run` — make sure `/var/www/html` is reachable on port 80 |
