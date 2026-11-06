const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
