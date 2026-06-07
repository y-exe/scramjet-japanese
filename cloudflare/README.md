# Cloudflare deployment folders

Use these paths in Cloudflare or GitHub Actions:

```txt
Pages build command: pnpm pages:build
Pages output directory: cloudflare/pages
Worker directory: cloudflare/worker
Worker name: proxy
```

Public endpoints:

```txt
Frontend: https://y-proxy.pages.dev
Worker: https://proxy.yexe.workers.dev
VPS bridge: https://papi.yexe.xyz
```

`papi.yexe.xyz` is only the Worker-facing bridge.
