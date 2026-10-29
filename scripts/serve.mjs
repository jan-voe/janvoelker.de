#!/usr/bin/env node
/**
 * Dependency-free static preview server.
 *
 * GitHub Pages serves this repo from the root of `main`, so serving the repo
 * root locally reproduces production paths exactly (e.g. /og-image.png).
 *
 *   npm run dev            -> http://localhost:8000
 *   PORT=3000 npm run dev  -> http://localhost:3000
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const send = (res, status, file, size) => {
  res.writeHead(status, {
    'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
};

const sendStatus = (res, status, message) => {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`${status} ${message}\n`);
};

const resolveFile = async (pathname) => {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  const target = normalize(join(ROOT, relative));

  // Reject path traversal and hidden files (.git, .DS_Store, ...).
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  if (pathname.split('/').some((part) => part.startsWith('.') && part.length > 1)) return null;

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const index = join(target, 'index.html');
      return { file: index, size: (await stat(index)).size };
    }
    return { file: target, size: info.size };
  } catch {
    return null;
  }
};

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host ?? HOST}`).pathname;
  const method = req.method ?? 'GET';

  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return sendStatus(res, 405, 'Method Not Allowed');
  }

  const found = await resolveFile(pathname);
  if (found) {
    console.log(`${method} 200 ${pathname}`);
    if (method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': MIME[extname(found.file).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': found.size });
      return res.end();
    }
    return send(res, 200, found.file, found.size);
  }

  // Mimic GitHub Pages: a missing path yields a plain 404 (or 404.html if present).
  const fallback = await resolveFile('/404.html');
  console.log(`${method} 404 ${pathname}`);
  if (fallback) return send(res, 404, fallback.file, fallback.size);
  return sendStatus(res, 404, `Not Found: ${pathname}`);
});

server.listen(PORT, HOST, () => {
  console.log(`janvoelker.de preview → http://${HOST}:${PORT}`);
  console.log(`serving ${ROOT}`);
  console.log('Ctrl+C to stop');
});
