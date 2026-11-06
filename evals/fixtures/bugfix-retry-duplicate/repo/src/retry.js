export function isRetryable(err) {
  return err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || (err.status >= 500 && err.status < 600);
}

export function backoff(attempt) {
  return Math.min(1000 * 2 ** (attempt - 1), 8000);
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 재시도할 수 있는 오류면 fn을 maxAttempts번까지 다시 부른다.
export async function withRetry(fn, { maxAttempts = 3, sleep = defaultSleep } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (!isRetryable(err) || attempt >= maxAttempts) throw err;
      await sleep(backoff(attempt));
    }
  }
}
