import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "dist/public");
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function safeJoin(base, targetPath) {
  const resolvedPath = path.resolve(base, "." + targetPath);
  if (!resolvedPath.startsWith(base)) {
    return null;
  }
  return resolvedPath;
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 500, "Internal Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`,
  );
  let requestPath = decodeURIComponent(url.pathname);

  if (requestPath === "/") {
    requestPath = "/index.html";
  }

  let filePath = safeJoin(rootDir, requestPath);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (!statErr && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.stat(filePath, (err, finalStats) => {
      if (!err && finalStats.isFile()) {
        serveFile(filePath, res);
        return;
      }

      const spaFallback = path.join(rootDir, "index.html");
      fs.stat(spaFallback, (fallbackErr, fallbackStats) => {
        if (!fallbackErr && fallbackStats.isFile()) {
          serveFile(spaFallback, res);
          return;
        }

        send(res, 404, "Not Found");
      });
    });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Static server running at http://localhost:${port}`);
  console.log(`Serving: ${rootDir}`);
});

server.on("error", (error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
