import http from "node:http";
import "dotenv/config";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createPersistentCookieMiddleware } from "./persistentCookies.ts";

const PORT = Number(process.env.EDGE_BACKEND_PORT || process.env.PORT || 4143);

wisp.options.allow_private_ips = true;
wisp.options.allow_loopback_ips = true;

const cookieMiddleware = createPersistentCookieMiddleware();

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/cookies")) {
    cookieMiddleware(req, res, () => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Cookie API route not found." }));
    });
    return;
  }

  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("backend route not found");
});

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
    return;
  }

  socket.destroy();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Scramjet edge backend listening on http://0.0.0.0:${PORT}`);
});
