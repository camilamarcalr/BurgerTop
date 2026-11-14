const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };
function createServer(options = {}) {
  const siteRoot = options.directory ? path.resolve(root, options.directory) : root;
  return http.createServer((req, res) => {
    let file;
    try { const url = new URL(req.url, 'http://localhost'); file = path.resolve(siteRoot, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); }
    catch { res.writeHead(400).end(); return; }
    const relative = path.relative(siteRoot, file);
    if (relative.startsWith('..') || relative.split(path.sep).some(part => part.startsWith('.') || part === 'node_modules')) { res.writeHead(403).end(); return; }
    if (path.basename(file) === 'favicon.ico') { res.writeHead(204).end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
  });
}
module.exports = { createServer };
if (require.main === module) {
  const production = process.argv.includes('--dist');
  if (production && !fs.existsSync(path.join(root, 'dist/index.html'))) {
    console.error('Execute npm run build antes de abrir a versão de produção.'); process.exit(1);
  }
  const port = production ? 4174 : 4173;
  createServer({ directory: production ? 'dist' : '.' }).listen(port, '127.0.0.1', () => console.log(`BurgerTop: http://127.0.0.1:${port}`));
}
