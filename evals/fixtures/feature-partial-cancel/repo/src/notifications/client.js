// 알림 서비스 클라이언트. template은 알림 서비스에 등록된 이름.
export function createNotifier({ baseUrl, fetchImpl = fetch } = {}) {
  return {
    async send(customerId, template, data) {
      await fetchImpl(`${baseUrl}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId, template, data }),
      });
    },
  };
}
