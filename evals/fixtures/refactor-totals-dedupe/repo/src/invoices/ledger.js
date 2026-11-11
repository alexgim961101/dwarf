// 회계 원장 가져오기 형식(CSV). 회계 시스템이 열 위치로 읽는다.
export const LEDGER_HEADER = 'invoice_no,kind,issued_on,customer,supply,discount,vat,shipping,total';

// 금액 열은 invoice.totals에 담긴 순서 그대로 쓴다.
export const ledgerRow = (invoice) =>
  [invoice.number, invoice.kind, invoice.issuedOn, invoice.customer, ...Object.values(invoice.totals)].join(',');

export const ledgerCsv = (invoices) => `${[LEDGER_HEADER, ...invoices.map(ledgerRow)].join('\n')}\n`;
