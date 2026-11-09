import http from 'node:http';
import { matchRoute } from './routes.js';
import { readJson, sendJson, sendText } from './json.js';

// JSON API. 요청마다 처리기를 실행하고 오류는 { error, message }로 돌려준다.
export function createServer(app) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const route = matchRoute(req.method, url.pathname);
    if (!route) return sendJson(res, 404, { error: 'NOT_FOUND', message: `${req.method} ${url.pathname}` });
    try {
      const body = req.method === 'POST' ? await readJson(req) : undefined;
      const out = await route.handler(app, route.params, body, url.searchParams);
      if (out.text !== undefined) return sendText(res, out.status, out.text);
      return sendJson(res, out.status, out.body);
    } catch (err) {
      const status = err.status ?? 500;
      if (status >= 500) app.logger.error('request.failed', { method: req.method, path: url.pathname, error: err.message });
      return sendJson(res, status, { error: err.code ?? 'INTERNAL', message: err.message });
    }
  });
}
