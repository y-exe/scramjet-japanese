# Cloudflare deployment folders

Use these paths in Cloudflare Git integrations.

```txt
Pages build command: pnpm pages:build:cloudflare
Pages output directory: cloudflare/pages
Pages root directory: /
Worker name: scramjet-japanese
Worker root directory: /
Worker build command: leave empty
Worker deploy command: npx wrangler deploy
```

Public endpoints:

```txt
Frontend: https://y-proxy.pages.dev
Worker: https://scramjet-japanese.yexe.workers.dev
VPS bridge: https://papi.yexe.xyz
```

`papi.yexe.xyz` is only the Worker-facing bridge.

Recommended Pages environment variables:

```txt
NODE_VERSION=22
PNPM_VERSION=10.12.1
```
