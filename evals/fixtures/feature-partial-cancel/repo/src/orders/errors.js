export class OrderNotFound extends Error {
  constructor(orderId) {
    super(`order not found: ${orderId}`);
    this.code = 'ORDER_NOT_FOUND';
  }
}

export class OrderNotCancellable extends Error {
  constructor(orderId, status) {
    super(`order ${orderId} cannot be cancelled in status ${status}`);
    this.code = 'ORDER_NOT_CANCELLABLE';
  }
}
