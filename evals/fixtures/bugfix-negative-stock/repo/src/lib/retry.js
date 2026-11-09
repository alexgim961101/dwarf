const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 연결 실패·타임아웃·5xx만 재시도한다. 4xx는 바로 던진다.
export function isRetryable(err) {
  if (['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(err?.code)) return true;
  if (err?.name === 'TimeoutError') return true;
  return typeof err?.status === 'number' && err.status >= 500;
}

export async function withRetry(fn, { attempts = 3, baseMs = 50 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) throw err;
      await sleep(baseMs * 2 ** i);
    }
  }
  throw lastErr;
}
