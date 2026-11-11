import http from 'node:http';
import { matchRoute } from './routes.js';
import { readJson, sendJson, sendText } from './json.js';

// 오류의 HTTP 상태. 도메인 오류는 자기 status를 갖고, 값 범위 오류(RangeError)는 잘못된 요청으로 본다.
function statusOf(err) {
  if (err.status) return err.status;
  return err instanceof RangeError ? 400 : 500;
}

// JSON API. 요청마다 처리기를 실행하고 오류는 { error, message }로 돌려준다.
export function createServer(app) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const route = matchRoute(req.method, url.pathname);
    if (!route) return sendJson(res, 404, { error: 'NOT_FOUND', message: `${req.method} ${url.pathname}` });
    try {
      const body = req.method === 'POST' ? await readJson(req) : undefined;
      const out = await route.handler(app, route.params, body);
      if (out.text !== undefined) return sendText(res, out.status, out.text);
      return sendJson(res, out.status, out.body);
    } catch (err) {
      const status = statusOf(err);
      const fallback = status === 400 ? 'BAD_REQUEST' : 'INTERNAL';
      return sendJson(res, status, { error: err.code ?? fallback, message: err.message });
    }
  });
}
