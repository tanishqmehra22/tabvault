// DEV-ONLY static server: serves extension/ and injects the chrome stub + background.js into HTML pages.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join, extname, normalize} from 'node:path';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..', 'extension');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json'};
http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://x').pathname;
    let file = path === '/__stub.js' ? join(here, 'chrome-stub.js') : join(root, normalize(path === '/' ? '/dashboard.html' : path));
    if (!file.startsWith(root) && file !== join(here, 'chrome-stub.js')) throw new Error('forbidden');
    let body = await readFile(file);
    if (extname(file) === '.html') body = Buffer.from(String(body).replace('<head>', '<head><script src="/__stub.js"></script><script type="module" src="/js/background.js"></script>'));
    res.writeHead(200, {'cache-control': 'no-store', 'content-type': types[extname(file)] || 'application/octet-stream'}).end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(Number(process.env.PORT) || 8765, '127.0.0.1', () => console.log('harness on http://127.0.0.1:' + (process.env.PORT || 8765)));
