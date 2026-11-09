// 경로 표. 처리기는 (app, params, body, query) → { status, body } 또는 { status, text }.
export const routes = [
  ['POST', /^\/reservations$/, async (app, _p, body) => ({
    status: 201,
    body: await app.reservations.reserve(body.sku, body.qty, body.customerId),
  })],
  ['POST', /^\/reservations\/([^/]+)\/confirm$/, async (app, [id]) => ({
    status: 200,
    body: await app.reservations.confirm(id),
  })],
  ['DELETE', /^\/reservations\/([^/]+)$/, async (app, [id]) => ({
    status: 200,
    body: await app.reservations.cancel(id),
  })],
  ['POST', /^\/pos\/sales$/, async (app, _p, body) => ({
    status: 201,
    body: await app.sales.recordSale(body.sku, body.qty, body.registerId),
  })],
  ['POST', /^\/pos\/sales\/([^/]+)\/void$/, async (app, [id]) => ({
    status: 200,
    body: await app.sales.voidSale(id),
  })],
  ['POST', /^\/restock$/, async (app, _p, body) => ({
    status: 201,
    body: await app.restock.receive(body.deliveryNoteId, body.lines),
  })],
  ['GET', /^\/stock\/([^/]+)$/, async (app, [sku]) => ({
    status: 200,
    body: { sku, qty: await app.repo.get(sku) },
  })],
  ['GET', /^\/reports\/daily$/, async (app) => ({
    status: 200,
    text: await app.reports.daily(),
  })],
];

export function matchRoute(method, pathname) {
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue;
    const found = pathname.match(pattern);
    if (found) return { handler, params: found.slice(1).map(decodeURIComponent) };
  }
  return null;
}
