const http = require("http");
const net = require("net");

const proxyPort = 9000;
const backend = { host: "127.0.0.1", port: 5198 };
const metro = { host: "127.0.0.1", port: 8081 };

function targetForPath(path) {
  return path === "/health" || path === "/api/health" || path.startsWith("/api/")
    ? backend
    : metro;
}

const server = http.createServer((req, res) => {
  const target = targetForPath(req.url || "/");
  const proxyReq = http.request(
    {
      headers: req.headers,
      host: target.host,
      method: req.method,
      path: req.url,
      port: target.port
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`Proxy error: ${error.message}`);
  });

  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const target = metro;
  const upstream = net.connect(target.port, target.host, () => {
    upstream.write(
      [
        `${req.method} ${req.url} HTTP/${req.httpVersion}`,
        ...Object.entries(req.headers).map(([key, value]) => `${key}: ${value}`),
        "",
        ""
      ].join("\r\n")
    );
    upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on("error", () => socket.destroy());
});

server.listen(proxyPort, "0.0.0.0", () => {
  console.log(`Gymmin proxy listening on http://localhost:${proxyPort}`);
});
