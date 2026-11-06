const http = require('node:http');
const { randomUUID } = require('node:crypto');

const version = '1.8.0';

http
  .createServer((req, res) => {
    const requestId = req.headers['x-request-id'] ?? randomUUID();
    res.setHeader('x-request-id', requestId);
    console.log(`${requestId} ${req.method} ${req.url}`);
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"status":"ok"}');
    }
    if (req.url === '/version') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ version }));
    }
    res.writeHead(404);
    res.end();
  })
  .listen(3000, () => console.log(`api ${version} listening on 3000`));
