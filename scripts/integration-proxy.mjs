// Minimal local stand-in for the Supabase API gateway: strips the /rest/v1 prefix
// supabase-js adds and forwards to the local PostgREST process. Anything else
// (auth, storage, realtime) is answered 404 so no request can leave this machine.
import http from "node:http";

const listenPort = Number(process.env.PROXY_PORT ?? 3001);
const upstreamPort = Number(process.env.PGRST_PORT ?? 3002);

const server = http.createServer((req, res) => {
  if (!req.url?.startsWith("/rest/v1")) {
    res.writeHead(404, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ message: "local harness: only /rest/v1 is proxied" }));
    return;
  }
  const upstream = http.request(
    { host: "127.0.0.1", port: upstreamPort, path: req.url.slice("/rest/v1".length) || "/", method: req.method, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
});

server.listen(listenPort, "127.0.0.1");
