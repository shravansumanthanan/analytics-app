const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
};

const server = http.createServer((req, res) => {
  console.log(`[${req.method}] ${req.url}`);

  let filePath;
  if (req.url === '/') {
    filePath = path.join(__dirname, 'index.html');
  } else if (req.url === '/tracker.js') {
    filePath = path.join(__dirname, '../tracker/tracker.js');
  } else {
    filePath = path.join(__dirname, req.url);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found', 'utf-8');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}/`);
  console.log(`Serving index.html and resolving /tracker.js`);
});
