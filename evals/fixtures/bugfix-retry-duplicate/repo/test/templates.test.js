import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/templates.js';

test('주문 템플릿에 주문 번호가 들어간다', () => {
  assert.match(render('order.paid', { orderId: 'A-1' }), /A-1/);
});

test('없는 템플릿은 오류', () => {
  assert.throws(() => render('nope', {}), /unknown template/);
});
