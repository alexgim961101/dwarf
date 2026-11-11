// 요청 본문 읽기와 응답 쓰기.
export function readJson(req, { limitBytes = 64 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) reject(Object.assign(new Error('본문이 너무 크다'), { code: 'PAYLOAD_TOO_LARGE', status: 413 }));
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('본문이 JSON이 아니다'), { code: 'BAD_JSON', status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export function sendText(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/csv; charset=utf-8' });
  res.end(text);
}
