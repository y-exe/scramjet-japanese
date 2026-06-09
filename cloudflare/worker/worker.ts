export interface Env {
  VPS_ORIGIN: string;
  ALLOWED_ORIGIN?: string;
  EDGE_SHARED_SECRET?: string;
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function copyRequestHeaders(
  request: Request,
  incomingUrl: URL,
  upstreamUrl: URL,
  isWebSocket: boolean,
) {
  const headers = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    if (isWebSocket && (header === "connection" || header === "upgrade")) {
      continue;
    }
    headers.delete(header);
  }

  headers.delete("host");
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));
  headers.set("x-forwarded-prefix", "");
  headers.set("x-worker-origin", incomingUrl.origin);
  headers.set("x-upstream-origin", upstreamUrl.origin);
  if (isWebSocket) {
    headers.set("x-wisp-proxy", "cloudflare-worker");
  }

  return headers;
}

function toUpstreamUrl(requestUrl: URL, origin: string) {
  const upstreamBase = new URL(origin);
  const basePath = upstreamBase.pathname.replace(/\/$/, "");
  const requestPath = requestUrl.pathname.startsWith("/")
    ? requestUrl.pathname
    : `/${requestUrl.pathname}`;
  const upstreamUrl = new URL(
    `${basePath}${requestPath}${requestUrl.search}`,
    upstreamBase,
  );
  upstreamUrl.hash = "";
  return upstreamUrl;
}

function rewriteLocation(
  location: string | null,
  upstreamOrigin: string,
  publicOrigin: string,
) {
  if (!location) return null;

  try {
    const parsed = new URL(location, upstreamOrigin);
    if (parsed.origin === upstreamOrigin) {
      const rewritten = new URL(
        parsed.pathname + parsed.search + parsed.hash,
        publicOrigin,
      );
      return rewritten.toString();
    }
  } catch {
    return location;
  }

  return location;
}

function copyResponseHeaders(
  response: Response,
  upstreamOrigin: string,
  publicOrigin: string,
  requestOrigin: string | null,
  allowedOrigin?: string,
) {
  const headers = new Headers(response.headers);
  const location = rewriteLocation(
    headers.get("location"),
    upstreamOrigin,
    publicOrigin,
  );

  if (location) headers.set("location", location);
  headers.delete("server");
  headers.delete("x-powered-by");
  headers.set("x-proxy-edge", "yexe-workers");

  if (allowedOrigin && requestOrigin === allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("access-control-allow-credentials", "true");
    headers.append("vary", "Origin");
  }

  return headers;
}

function isBackendRoute(pathname: string) {
  return (
    pathname === "/healthz" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/wisp/")
  );
}

function corsPreflight(request: Request, env: Env) {
  const requestOrigin = request.headers.get("origin");
  if (!env.ALLOWED_ORIGIN || requestOrigin !== env.ALLOWED_ORIGIN) return null;

  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": env.ALLOWED_ORIGIN,
      "access-control-allow-credentials": "true",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers":
        request.headers.get("access-control-request-headers") || "content-type",
      vary: "Origin",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.VPS_ORIGIN) {
      return new Response("VPS_ORIGIN is not configured.", { status: 500 });
    }

    const incomingUrl = new URL(request.url);
    if (!isBackendRoute(incomingUrl.pathname)) {
      return new Response("Worker only proxies backend routes.", {
        status: 404,
      });
    }

    if (request.method === "OPTIONS") {
      const preflight = corsPreflight(request, env);
      if (preflight) return preflight;
    }

    const upstreamUrl = toUpstreamUrl(incomingUrl, env.VPS_ORIGIN);
    const isWebSocket =
      request.headers.get("upgrade")?.toLowerCase() === "websocket";
    const headers = copyRequestHeaders(
      request,
      incomingUrl,
      upstreamUrl,
      isWebSocket,
    );
    if (env.EDGE_SHARED_SECRET) {
      headers.set("x-edge-secret", env.EDGE_SHARED_SECRET);
    }

    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "manual",
    });

    const response = await fetch(upstreamRequest);
    if (isWebSocket) return response;

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyResponseHeaders(
        response,
        new URL(env.VPS_ORIGIN).origin,
        incomingUrl.origin,
        request.headers.get("origin"),
        env.ALLOWED_ORIGIN,
      ),
    });
  },
};
