// Tiny static server for local preview: node tools/serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const port = Number(process.argv[2]) || 8123;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = path.join(root, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log('serving on http://localhost:' + port));
