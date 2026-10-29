const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";

  const filePath = path.join(BASE_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bản đồ PWA đang chạy tại: http://localhost:${PORT}`);
});

