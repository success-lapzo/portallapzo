#!/usr/bin/env node
/* Servidor estatico minimo, sin dependencias.
   Sirve la raiz del proyecto para poder abrir el hub en el navegador.
   Uso:  node tools/dev-server.mjs [puerto]   |   npm start            */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = Number(process.argv[2] || process.env.PORT || 5173);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8"
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let destino = path.join(RAIZ, url === "/" ? "index.html" : url);

    // Nunca servir fuera de la raiz del proyecto
    if (!destino.startsWith(RAIZ)) {
      res.writeHead(403).end("403");
      return;
    }
    if (fs.existsSync(destino) && fs.statSync(destino).isDirectory()) {
      destino = path.join(destino, "index.html");
    }
    if (!fs.existsSync(destino)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404: " + url);
      return;
    }
    res.writeHead(200, {
      "Content-Type": TIPOS[path.extname(destino)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(destino).pipe(res);
  })
  .listen(PUERTO, () => {
    console.log("Hub de Activaciones Lapzo -> http://localhost:" + PUERTO);
  });
