const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 로컬 개발·테스트용 가격 서비스. 실제 서비스처럼 응답에 시간이 걸린다.
export function createFakePricing({ prices = {}, delayMs = 5, failWith } = {}) {
  return {
    async quote(sku, qty) {
      await sleep(delayMs);
      if (failWith) throw failWith;
      if (!(sku in prices)) throw new Error(`unknown sku: ${sku}`);
      return prices[sku] * qty;
    },
  };
}

// 로컬 개발·테스트용 환불 서비스. 보낸 환불을 issued에 남긴다.
export function createFakeRefunds({ delayMs = 5, failTimes = 0 } = {}) {
  let failuresLeft = failTimes;
  const issued = [];
  return {
    issued,
    async issue(customerId, amount) {
      await sleep(delayMs);
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error('refund service unavailable');
      }
      issued.push({ customerId, amount });
    },
  };
}
