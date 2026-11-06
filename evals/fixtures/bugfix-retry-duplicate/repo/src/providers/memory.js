// 개발·테스트용 provider. 실제 provider처럼 같은 id는 한 번만 전달한다.
// failures는 send 호출마다 앞에서부터 하나씩 적용한다.
//   { when: 'before' }  전달하지 못하고 연결 오류
//   { when: 'after' }   전달은 됐지만 응답이 늦어 타임아웃
export function createMemoryProvider({ failures = [] } = {}) {
  const delivered = [];
  const seen = new Set();
  const queue = [...failures];
  return {
    delivered,
    async send(message) {
      const failure = queue.shift();
      if (failure?.when === 'before') {
        throw Object.assign(new Error('connect ECONNRESET'), { code: 'ECONNRESET' });
      }
      if (!seen.has(message.id)) {
        seen.add(message.id);
        delivered.push(message);
      }
      if (failure?.when === 'after') {
        throw Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' });
      }
      return { accepted: true };
    },
  };
}
