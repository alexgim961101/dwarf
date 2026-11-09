// 서비스 오류. code는 API 응답의 error, status는 HTTP 상태.
export class StockError extends Error {
  constructor(code, status, message, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    Object.assign(this, details);
  }
}

export class InsufficientStock extends StockError {
  constructor(sku, available, requested) {
    super('INSUFFICIENT_STOCK', 409, `${sku}: 재고 ${available}, 요청 ${requested}`, { sku, available, requested });
  }
}

export class ReservationNotFound extends StockError {
  constructor(id) {
    super('RESERVATION_NOT_FOUND', 404, `예약 없음: ${id}`, { id });
  }
}

export class ReservationNotActive extends StockError {
  constructor(id, reservationStatus) {
    super('RESERVATION_NOT_ACTIVE', 409, `예약 ${id}은(는) ${reservationStatus} 상태`, { id, reservationStatus });
  }
}

export class SaleNotFound extends StockError {
  constructor(id) {
    super('SALE_NOT_FOUND', 404, `판매 없음: ${id}`, { id });
  }
}

export class UnknownSku extends StockError {
  constructor(sku) {
    super('UNKNOWN_SKU', 404, `카탈로그에 없는 SKU: ${sku}`, { sku });
  }
}

export class InvalidQuantity extends StockError {
  constructor(qty) {
    super('INVALID_QUANTITY', 400, `수량은 1 이상의 정수여야 한다: ${qty}`, { qty });
  }
}
