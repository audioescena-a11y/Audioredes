// Servidor local de prueba: sirve /public y ejecuta las funciones como Netlify.
// Uso:  ACCESS_ANSWER=tu-respuesta SESSION_SECRET=algo-largo-de-16+ node test/dev-server.js
// Si MOCK_AI=1, simula la respuesta de Anthropic (no gasta créditos).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "public");
const PORT = process.env.PORT || 8888;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };

if (process.env.MOCK_AI === "1") {
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (String(url).endsWith("/v1/messages")) {
      const body = JSON.parse(opts.body);
      global.__lastAI = { headers: opts.headers, body };
      return new Response(JSON.stringify({ content: [{ type: "text", text: "✅ Respuesta simulada. Recibí " + body.messages.length + " mensaje(s). Modelo: " + body.model }] }), { status: 200 });
    }
    return realFetch(url, opts);
  };
}

// Las funciones son v2 (ESM): reciben Request y devuelven Response
const fns = {};
const load = (name) => (fns[name] ||= import(`../netlify/functions/${name}.mjs`).then((m) => m.default));

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const m = /^\/(?:api|\.netlify\/functions)\/(\w+)$/.exec(url.pathname);
  if (m && ["login", "ask"].includes(m[1])) {
    let body = "";
    for await (const c of req) body += c;
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const r = await (await load(m[1]))(new Request("http://localhost" + req.url, { method: req.method, headers: req.headers, body: hasBody ? body : undefined }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(await r.text());
  }
  if (url.pathname === "/__lastai") { res.writeHead(200); return res.end(JSON.stringify(global.__lastAI || null)); }
  let p = path.join(ROOT, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log("Audioredes local en http://localhost:" + PORT));
