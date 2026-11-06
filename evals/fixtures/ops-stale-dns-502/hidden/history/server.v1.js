const http = require('node:http');

const version = '1.7.0';

http
  .createServer((req, res) => {
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
