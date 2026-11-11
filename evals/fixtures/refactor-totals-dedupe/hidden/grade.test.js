// 숨김 채점. 바꾸기 전 저장소(ORIGINAL_REPO)와 작업 공간을 같은 입력으로 돌려 결과를 비교한다.
// 밖에서 쓰는 표면만 쓴다: createApp, createServer, scripts/*.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WORKSPACE = fileURLToPath(new URL('..', import.meta.url));
const ORIGINAL = process.env.ORIGINAL_REPO;
const NOW = '2026-11-03T02:00:00.000Z';
const clock = { now: () => NOW, today: () => NOW.slice(0, 10) };

async function load(root) {
  const { createApp } = await import(pathToFileURL(join(root, 'src/app.js')).href);
  const { createServer } = await import(pathToFileURL(join(root, 'src/http/server.js')).href);
  return { root, createServer, app: () => createApp({ clock }) };
}

// 가져오기 실패가 테스트마다 이름과 함께 실패로 남도록 테스트 안에서 부른다.
let loaded;
function sides() {
  assert.ok(ORIGINAL, 'ORIGINAL_REPO가 필요하다');
  loaded ??= Promise.all([load(WORKSPACE), load(ORIGINAL)]).then(([changed, original]) => ({ changed, original }));
  return loaded;
}

// API로 보이는 결과만 비교한다. JSON으로 옮겨 키 순서와 undefined를 지운다.
async function outcome(run) {
  try {
    return { ok: JSON.parse(JSON.stringify(await run())) };
  } catch (err) {
    return { error: err.code ?? err.name };
  }
}

async function assertSame(label, input, runChanged, runOriginal) {
  const changed = await outcome(runChanged);
  const original = await outcome(runOriginal);
  assert.deepStrictEqual(
    changed,
    original,
    `${label}: 입력 ${JSON.stringify(input)}\n바꾼 뒤 ${JSON.stringify(changed)}\n바꾸기 전 ${JSON.stringify(original)}`,
  );
  return original;
}

function random(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKUS = JSON.parse(readFileSync(join(ORIGINAL ?? WORKSPACE, 'src/catalog/products.json'), 'utf8')).map((p) => p.sku);
const COUPONS = [undefined, undefined, 'WELCOME10', 'BULK15', 'SAVE5000', 'TEACHER7'];
const REGIONS = [undefined, 'seoul', 'busan', 'jeju', 'ulleung', 'daejeon'];
const pick = (next, list) => list[Math.floor(next() * list.length)];

function basket(next, { zeroRows = false } = {}) {
  const pool = [...SKUS];
  const items = [];
  const count = 1 + Math.floor(next() * 5);
  for (let i = 0; i < count; i += 1) {
    const [sku] = pool.splice(Math.floor(next() * pool.length), 1);
    const qty = zeroRows && next() < 0.15 ? 0 : 1 + Math.floor(next() * (next() < 0.2 ? 60 : 12));
    items.push({ sku, qty });
  }
  return { customer: `C-${1000 + Math.floor(next() * 9000)}`, items, couponCode: pick(next, COUPONS), region: pick(next, REGIONS) };
}

// 무료배송 기준 근처. 정가 51,920원, WELCOME10을 쓰면 46,728원.
const NEAR_FREE_SHIPPING = { customer: 'C-1', region: 'seoul', items: [{ sku: 'PP-A4-500', qty: 8 }], couponCode: 'WELCOME10' };

test('cart-summaries-unchanged', async () => {
  const { changed, original } = await sides();
  const [a, b] = [changed.app(), original.app()];
  const next = random(11);
  for (let i = 0; i < 300; i += 1) {
    const input = basket(next, { zeroRows: true });
    await assertSame('장바구니', input, () => a.cart.summarize(input), () => b.cart.summarize(input));
  }
});

test('orders-and-invoices-unchanged', async () => {
  const { changed, original } = await sides();
  const [a, b] = [changed.app(), original.app()];
  const next = random(23);
  for (let i = 0; i < 300; i += 1) {
    const input = basket(next);
    const placed = await assertSame('주문', input, () => a.orders.place(input), () => b.orders.place(input));
    const id = placed.ok.id;
    await assertSame('세금계산서', input, () => a.invoices.build(id), () => b.invoices.build(id));
  }
});

test('credit-notes-unchanged', async () => {
  const { changed, original } = await sides();
  const [a, b] = [changed.app(), original.app()];
  const next = random(37);
  for (let i = 0; i < 150; i += 1) {
    const input = basket(next);
    const placed = await assertSame('주문', input, () => a.orders.place(input), () => b.orders.place(input));
    const returns = input.items
      .filter(() => next() < 0.6)
      .map(({ sku, qty }) => ({ sku, qty: 1 + Math.floor(next() * qty) }));
    if (returns.length === 0) returns.push({ sku: input.items[0].sku, qty: 1 });
    const id = placed.ok.id;
    await assertSame('반품 전표', { input, returns }, () => a.invoices.credit(id, returns), () => b.invoices.credit(id, returns));
  }
});

test('cart-free-shipping-follows-list-price', async () => {
  const { changed, original } = await sides();
  const input = NEAR_FREE_SHIPPING;
  const result = await assertSame('장바구니', input, () => changed.app().cart.summarize(input), () => original.app().cart.summarize(input));
  assert.equal(result.ok.totals.shipping, 0);
});

test('order-shipping-follows-discounted-amount', async () => {
  const { changed, original } = await sides();
  const input = NEAR_FREE_SHIPPING;
  const result = await assertSame('주문', input, () => changed.app().orders.place(input), () => original.app().orders.place(input));
  assert.equal(result.ok.totals.shipping, 3000);
});

test('cart-keeps-zero-quantity-rows', async () => {
  const { changed, original } = await sides();
  const input = { items: [{ sku: 'NB-A5-80', qty: 0 }, { sku: 'PN-GEL-05', qty: 2 }], region: 'seoul' };
  const result = await assertSame('장바구니', input, () => changed.app().cart.summarize(input), () => original.app().cart.summarize(input));
  assert.equal(result.ok.items.length, 2);
  assert.equal(result.ok.totals.subtotal, 16900);
});

test('http-status-for-bad-quantities-unchanged', async () => {
  const { changed, original } = await sides();
  const servers = [];
  const serve = async (side) => {
    const server = side.createServer(side.app());
    await new Promise((resolve) => server.listen(0, resolve));
    servers.push(server);
    return `http://localhost:${server.address().port}`;
  };
  const post = async (base, path, body) => {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, error: (await res.json()).error };
  };
  try {
    const [a, b] = [await serve(changed), await serve(original)];
    const requests = [
      ['/cart/summary', { items: [{ sku: 'NB-A5-80', qty: 0 }] }],
      ['/cart/summary', { items: [{ sku: 'NB-A5-80', qty: -1 }] }],
      ['/orders', { customer: 'C-1', region: 'seoul', items: [{ sku: 'NB-A5-80', qty: 0 }] }],
      ['/orders', { customer: 'C-1', region: 'seoul', items: [{ sku: 'NB-A5-80', qty: -1 }] }],
    ];
    for (const [path, body] of requests) {
      const got = await post(a, path, body);
      const want = await post(b, path, body);
      assert.deepStrictEqual(got, want, `${path} ${JSON.stringify(body)}`);
    }
    assert.equal((await post(b, '/cart/summary', { items: [{ sku: 'NB-A5-80', qty: -1 }] })).status, 400);
    assert.equal((await post(b, '/orders', { customer: 'C-1', items: [{ sku: 'NB-A5-80', qty: 0 }] })).status, 422);
  } finally {
    for (const server of servers) server.close();
  }
});

test('invoice-vat-rounded-per-line', async () => {
  const { changed, original } = await sides();
  const [a, b] = [changed.app(), original.app()];
  // 줄마다 반올림하면 2,254원, 합계에서 한 번 반올림하면 2,253원.
  const input = { customer: 'C-1', region: 'seoul', items: [{ sku: 'NB-A5-80', qty: 3 }, { sku: 'ST-STP-10', qty: 3 }, { sku: 'TP-OPP-48', qty: 1 }] };
  await assertSame('주문', input, () => a.orders.place(input), () => b.orders.place(input));
  const invoice = await assertSame('세금계산서', input, () => a.invoices.build('ORD-0001'), () => b.invoices.build('ORD-0001'));
  assert.equal(invoice.ok.totals.tax, invoice.ok.lines.reduce((sum, line) => sum + line.tax, 0));
});

test('credit-note-mirrors-invoice-line', async () => {
  const { changed, original } = await sides();
  const [a, b] = [changed.app(), original.app()];
  // 1,235원의 세액은 123.5원이라 반올림 방향이 드러난다.
  const input = { customer: 'C-1', region: 'seoul', items: [{ sku: 'NB-A5-80', qty: 1 }] };
  await assertSame('주문', input, () => a.orders.place(input), () => b.orders.place(input));
  const returns = [{ sku: 'NB-A5-80', qty: 1 }];
  const credit = await assertSame('반품 전표', returns, () => a.invoices.credit('ORD-0001', returns), () => b.invoices.credit('ORD-0001', returns));
  assert.deepStrictEqual(credit.ok.totals, { subtotal: -1235, discount: 0, tax: -124, shipping: 0, total: -1359 });
});

const cli = (root, ...args) =>
  execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

test('ledger-export-unchanged', () => {
  assert.ok(ORIGINAL, 'ORIGINAL_REPO가 필요하다');
  assert.equal(cli(WORKSPACE, 'scripts/export-ledger.js'), cli(ORIGINAL, 'scripts/export-ledger.js'));
});

test('reconcile-job-unchanged', () => {
  assert.ok(ORIGINAL, 'ORIGINAL_REPO가 필요하다');
  assert.equal(cli(WORKSPACE, 'scripts/run-job.js', 'reconcile'), cli(ORIGINAL, 'scripts/run-job.js', 'reconcile'));
});

// 복붙이 남았는지. src/ 아래 서로 다른 두 파일이 토큰 60개 이상 이어지는 같은 코드를 가지면 실패한다.
const WINDOW = 60;
const TOKEN = /[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|[^\s\w]/g;
const tokensOf = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/.*$/gm, ' ').match(TOKEN) ?? [];

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

test('duplicated-calculation-removed', () => {
  const firstSeen = new Map();
  const pairs = new Set();
  for (const file of sourceFiles(join(WORKSPACE, 'src')).sort()) {
    const tokens = tokensOf(readFileSync(file, 'utf8'));
    for (let i = 0; i + WINDOW <= tokens.length; i += 1) {
      const key = tokens.slice(i, i + WINDOW).join('\u0001');
      const first = firstSeen.get(key);
      if (first === undefined) firstSeen.set(key, file);
      else if (first !== file) pairs.add(`${relative(WORKSPACE, first)} = ${relative(WORKSPACE, file)}`);
    }
  }
  assert.deepEqual([...pairs], [], '같은 코드가 두 파일에 남아 있다');
});
