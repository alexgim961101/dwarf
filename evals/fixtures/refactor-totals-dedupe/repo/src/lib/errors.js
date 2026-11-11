// 도메인 오류. code는 API 응답의 error, status는 HTTP 상태.
export class DomainError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
  }
}

export const unknownSku = (sku) => new DomainError('UNKNOWN_SKU', 404, `없는 상품: ${sku}`);
export const unknownCoupon = (code) => new DomainError('UNKNOWN_COUPON', 404, `없는 쿠폰: ${code}`);
export const orderNotFound = (id) => new DomainError('ORDER_NOT_FOUND', 404, `없는 주문: ${id}`);
export const invalidQuantity = (sku) =>
  new DomainError('INVALID_QUANTITY', 422, `수량은 1 이상의 정수여야 한다: ${sku}`);
