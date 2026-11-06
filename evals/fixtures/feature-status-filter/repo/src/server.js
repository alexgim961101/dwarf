import http from 'node:http';
import { BadRequest, parsePagination } from './query.js';

export function createServer(store) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/orders') {
        const { page, size } = parsePagination(url.searchParams);
        const all = store.list();
        const items = all.slice((page - 1) * size, page * size);
        return json(res, 200, { items, total: all.length, page, size });
      }
      return json(res, 404, { error: 'not found' });
    } catch (err) {
      if (err instanceof BadRequest) return json(res, 400, { error: err.message });
      return json(res, 500, { error: 'internal error' });
    }
  });
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
