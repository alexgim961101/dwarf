const http = require('node:http');

const port = Number(process.env.PORT ?? 3000);
const logLevel = process.env.LOG_LEVEL ?? 'info';

http
  .createServer((req, res) => {
    if (logLevel === 'debug') console.log(`${req.method} ${req.url}`);
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"status":"ok"}');
    }
    res.writeHead(404);
    res.end();
  })
  .listen(port, () => console.log(`api listening on ${port}`));
