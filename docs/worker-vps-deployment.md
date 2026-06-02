# yexe.workers.dev edge deployment

This setup makes the public site look like it is served from `yexe.workers.dev`,
while the actual Scramjet demo and Wisp server stay behind your VPS reverse
proxy.

## Traffic path

```txt
browser
  -> https://yexe.workers.dev
  -> Cloudflare Worker
  -> VPS reverse proxy
  -> home server Scramjet demo / Wisp
```

## App environment on the home server

Use the worker.dev origin for public browser-facing URLs:

```env
VITE_PUBLIC_ORIGIN=https://yexe.workers.dev
VITE_WISP_URL=wss://yexe.workers.dev/wisp/
```

If `VITE_WISP_URL` is omitted, `devserver.ts` derives it from
`VITE_PUBLIC_ORIGIN` as `/wisp/`.

## Worker deploy

Copy the example config and set your VPS origin:

```sh
cd workers/yexe-proxy-worker
cp wrangler.toml.example wrangler.toml
```

Then edit:

```toml
VPS_ORIGIN = "https://your-vps-proxy.example.com"
```

Deploy:

```sh
npx wrangler deploy
```

## VPS reverse proxy shape

The VPS should proxy normal HTTP traffic to the demo app and WebSocket traffic
under `/wisp/` to the Wisp server. It should pass the worker-facing host through
to the home server:

```nginx
location / {
    proxy_pass http://home-server:4141;
    proxy_set_header Host $http_x_forwarded_host;
    proxy_set_header X-Forwarded-Host $http_x_forwarded_host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Real-IP $remote_addr;
}

location /wisp/ {
    proxy_pass http://home-server:4142/;
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
