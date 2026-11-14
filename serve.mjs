import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

process.on('uncaughtException', (err) => {
  console.error('Server caught exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Server unhandled rejection:', reason);
});

const server = http.createServer((req, res) => {
  req.on('error', (err) => {
    console.error('Request error:', err.message);
  });
  res.on('error', (err) => {
    console.error('Response error:', err.message);
  });

  const urlPath = req.url ? req.url.split('?')[0] : '/';
  const cleanPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(DIST_DIR, cleanPath);

  // Security check: ensure resolved path is inside DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  function streamFile(targetPath, contentType) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    const stream = fs.createReadStream(targetPath);
    stream.on('error', (err) => {
      console.error('File stream error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end();
    });
    stream.pipe(res);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    streamFile(filePath, contentType);
  } else {
    // Fallback to index.html for SPA routes if file doesn't exist
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      streamFile(indexPath, 'text/html; charset=utf-8');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found. Please run `npm run build` first.');
    }
  }
});

server.on('error', (err) => {
  console.error('HTTP Server error:', err.message);
});

server.listen(PORT, () => {
  console.log(`Exam Lines is running at: http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});
