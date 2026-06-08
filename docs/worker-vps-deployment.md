# Pages + Worker + VPS deployment

This setup makes the public site look like it is served by Cloudflare Pages and
Workers, while the actual Scramjet Wisp server and cookie API stay behind your
VPS reverse proxy.

## Traffic path

```txt
browser
  -> https://y-proxy.pages.dev for static frontend files
  -> https://scramjet-japanese.yexe.workers.dev for /api/*, /wisp/*, /healthz
  -> https://papi.yexe.xyz as the Worker-facing VPS origin
  -> home PC Docker backend
```

`papi.yexe.xyz` is only the Worker-facing bridge. Do not present it as the
public user URL.

## Frontend on Cloudflare Pages

Build the frontend and required Scramjet assets for Pages locally:

```sh
pnpm pages:build
```

Use this Cloudflare Pages Git configuration:

```txt
Framework preset: None
Production branch: main
Build command: pnpm pages:build:cloudflare
Build output directory: cloudflare/pages
Root directory: /
```

Add these Pages build environment variables:

```txt
NODE_VERSION=22
PNPM_VERSION=10.12.1
```

The Pages output generator writes a Cloudflare `_headers` file with COOP/COEP
headers. Scramjet needs the public Pages app to be cross-origin isolated for
better JavaScript compatibility on sites that use synchronous XHR or
`SharedArrayBuffer`-gated browser behavior.

The committed production env points the Pages frontend at the Worker:

```env
VITE_API_ORIGIN=https://scramjet-japanese.yexe.workers.dev
VITE_WISP_URL=wss://scramjet-japanese.yexe.workers.dev/wisp/
```

Because `y-proxy.pages.dev` and `scramjet-japanese.yexe.workers.dev` are
separate origins, the Worker must allow `https://y-proxy.pages.dev` through CORS.

## Worker Git deploy

Connect the existing Worker named `scramjet-japanese` to the same GitHub
repository. Use the repository root so Wrangler can read the root
`wrangler.toml`:

```txt
Root directory: /
Build command: leave empty
Deploy command: npx wrangler deploy
```

If you want to target the nested config explicitly, this also works:

```txt
Root directory: /
Build command: leave empty
Deploy command: pnpm worker:deploy:cloudflare
```

It is already configured for the current VPS bridge:

```toml
VPS_ORIGIN = "https://papi.yexe.xyz"
ALLOWED_ORIGIN = "https://y-proxy.pages.dev"
```

If the Worker is on a different origin than Pages, set `ALLOWED_ORIGIN` too.
Same-host routes are strongly preferred because browser credentials and service
worker behavior stay simpler.

With the current `workers.dev` / `pages.dev` split, no custom route is required
yet. The Worker is directly available at:

```txt
https://scramjet-japanese.yexe.workers.dev
```

If a custom domain is added later, route `/api/*`, `/wisp/*`, and `/healthz` to
the Worker and let Pages own every other path.

## Home PC backend

Run the backend-only server in the Docker container or directly on the host:

```sh
pnpm backend:edge
```

Container build/run example:

```sh
docker build -f Dockerfile.edge-backend -t scramjet-edge-backend .
docker run --rm -p 4143:4143 --env-file .env scramjet-edge-backend
```

On this Windows host, use the redeploy script after backend changes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/redeploy-edge-backend.ps1
```

It rebuilds `scramjet-edge-backend:latest`, replaces the
`proxy-edge-backend` container, keeps the `proxy-edge-cookie-store` volume, and
checks `http://127.0.0.1:4143/healthz`.

It listens on `EDGE_BACKEND_PORT` or `PORT`, defaulting to `4143`, and exposes:

```txt
/api/cookies/*
/wisp/*
/healthz
```

## VPS reverse proxy shape

The VPS should proxy Worker-facing backend traffic to the home PC backend. With
the default backend port, add a reverse SSH forward like:

```txt
4143:127.0.0.1:4143
```

`C:\Users\yexe\code\vps.bat` launches `vps-watchdog.ps1`, so add the new port
there if this app should ride the same existing tunnel system.

Example nginx shape on the VPS:

```nginx
location / {
    proxy_pass http://127.0.0.1:4143;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $http_x_forwarded_host;
    proxy_set_header X-Forwarded-Host $http_x_forwarded_host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Keep the Worker transparent: do not rewrite HTML or buffer response bodies at
the Worker layer.
