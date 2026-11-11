// 로컬 실행과 스크립트가 쓰는 시드 주문.
export const SEED_TIME = '2026-10-30T09:00:00.000Z';

const ORDERS = [
  {
    customer: 'C-1042',
    region: 'seoul',
    items: [{ sku: 'NB-A5-80', qty: 30 }, { sku: 'PN-GEL-05', qty: 4 }],
    couponCode: 'WELCOME10',
  },
  {
    customer: 'C-2210',
    region: 'jeju',
    items: [{ sku: 'BK-WKB-3', qty: 12 }, { sku: 'FL-A4-100', qty: 7 }, { sku: 'TP-OPP-48', qty: 3 }],
    couponCode: 'TEACHER7',
  },
  { customer: 'C-0007', region: 'busan', items: [{ sku: 'PP-A4-500', qty: 8 }], couponCode: 'WELCOME10' },
  { customer: 'C-3318', region: 'seoul', items: [{ sku: 'ST-STP-10', qty: 1 }] },
  {
    customer: 'C-1042',
    region: 'seoul',
    items: [{ sku: 'BK-DIC-KE', qty: 10 }, { sku: 'CL-DSK-01', qty: 25 }, { sku: 'NB-A5-80', qty: 55 }],
    couponCode: 'BULK15',
  },
  {
    customer: 'C-4401',
    region: 'ulleung',
    items: [{ sku: 'BK-ATL-01', qty: 2 }, { sku: 'PN-GEL-05', qty: 1 }],
    couponCode: 'SAVE5000',
  },
  {
    customer: 'C-0907',
    region: 'daejeon',
    items: [{ sku: 'TP-OPP-48', qty: 9 }, { sku: 'FL-A4-100', qty: 9 }, { sku: 'CL-DSK-01', qty: 9 }],
    couponCode: 'TEACHER7',
  },
  { customer: 'C-5120', region: 'gwangju', items: [{ sku: 'NB-A5-80', qty: 3 }, { sku: 'ST-STP-10', qty: 3 }] },
];

export async function seed(app) {
  const orders = [];
  for (const input of ORDERS) orders.push(await app.orders.place(input));
  return orders;
}
