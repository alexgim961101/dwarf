// 경로 표. 처리기는 (app, params, body) → { status, body } 또는 { status, text }.
export const routes = [
  ['POST', /^\/cart\/summary$/, async (app, _params, body) => ({
    status: 200,
    body: app.cart.summarize(body),
  })],
  ['POST', /^\/orders$/, async (app, _params, body) => ({
    status: 201,
    body: await app.orders.place(body),
  })],
  ['GET', /^\/orders\/([^/]+)$/, async (app, [id]) => ({
    status: 200,
    body: await app.orders.get(id),
  })],
];

export function matchRoute(method, pathname) {
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    const found = pathname.match(pattern);
    if (found) return { handler, params: found.slice(1).map(decodeURIComponent) };
  }
  return null;
}
