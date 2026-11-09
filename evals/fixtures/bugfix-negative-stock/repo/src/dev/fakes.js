const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 로컬·테스트용 가격 서비스. 실제 서비스처럼 응답에 시간이 걸린다.
export function createFakePricing({ prices = {}, delayMs = 5, failWith } = {}) {
  const calls = [];
  return {
    calls,
    async quote(sku, qty) {
      calls.push({ sku, qty });
      await sleep(delayMs);
      if (failWith) throw failWith;
      if (!(sku in prices)) throw Object.assign(new Error(`unknown sku: ${sku}`), { status: 404 });
      return prices[sku] * qty;
    },
  };
}

// 로컬·테스트용 환불 서비스. 보낸 환불을 issued에 남기고, failTimes만큼은 먼저 실패한다.
export function createFakeRefunds({ delayMs = 5, failTimes = 0 } = {}) {
  let failuresLeft = failTimes;
  const issued = [];
  return {
    issued,
    async issue(customerId, amount, meta = {}) {
      await sleep(delayMs);
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw Object.assign(new Error('refund service unavailable'), { status: 503 });
      }
      issued.push({ customerId, amount, ...meta });
    },
  };
}
