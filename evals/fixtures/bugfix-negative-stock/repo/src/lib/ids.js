import { randomUUID } from 'node:crypto';

// 접두사가 붙은 짧은 id. 로그와 API 응답에서 종류를 바로 알아보게.
export const newId = (prefix) => `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
