import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { isRetiredSourcePath } from "./check-source-distribution.mjs";
const root = path.resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ttf": "font/ttf",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (isRetiredSourcePath(url.href)) {
        res.writeHead(404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" });
        res.end(req.method === "HEAD" ? undefined : "Not found");
        return;
      }
      let file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let info;
      try { info = await stat(file); }
      catch {
        if (path.extname(file)) throw new Error("Not found");
        file += ".html";
        info = await stat(file);
      }
      if (info.isDirectory())
        file = path.join(file, "index.html");
      res.writeHead(200, {
        "content-type": types[path.extname(file)] || "application/octet-stream",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(8081, "127.0.0.1", () =>
    process.stdout.write("Ippomed: http://127.0.0.1:8081\n"),
  );
