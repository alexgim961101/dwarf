#!/usr/bin/env bash
# 커밋 여섯 개. 금액 계산 세 벌이 왜 서로 다른지가 커밋 메시지에 남는다.
#   75일 전: 세금계산서는 세액을 줄마다 반올림하고, 금액 키 순서는 원장 열 순서
#   40일 전: 장바구니만 무료배송을 쿠폰 전 금액으로 판정
#   26일 전: 주문만 수량을 검증(장바구니는 수량 0인 줄을 둔다)
#   15일 전: 반품 전표의 음수 반올림과 배송비 0
set -eu
ws=$1
h=$(cd "$(dirname "$0")" && pwd)/history
tmp=$(mktemp -d)
ago() { date -u -d "$1" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v"$2" '+%Y-%m-%dT%H:%M:%SZ'; }
commit() { # 날짜 제목 [본문]
  git add -A
  GIT_AUTHOR_DATE=$1 GIT_COMMITTER_DATE=$1 git -c user.name=dev -c user.email=dev@example.com \
    commit -q -m "$2" ${3:+-m "$3"}
}
readme_until() { sed "/^## $1/,\$d" "$tmp/final/README.md" >README.md; }
cd "$ws"

# 최종 버전 보관. 아래에서 단계마다 되돌려 놓는다.
mkdir -p "$tmp/final"
cp -R src test scripts config README.md package.json "$tmp/final/"

# 1. 120일 전: 장바구니와 주문. 금액 계산은 처음부터 두 벌이었다.
rm -rf src/invoices src/jobs scripts config test/invoices.test.js test/credit.test.js test/order-validation.test.js
cp "$h/app.v1.js" src/app.js
cp "$h/routes.v1.js" src/http/routes.js
cp "$h/cart-totals.v1.js" src/cart/totals.js
cp "$h/orders-totals.v1.js" src/orders/totals.js
readme_until '세금계산서와 원장'
commit "$(ago '120 days ago' -120d)" "feat: catalog, coupons, cart preview, order placement and json api"

# 2. 75일 전: 세금계산서와 원장. 주문 금액 계산을 복사해 줄별 세액으로 바꿨다.
mkdir -p src/invoices scripts
cp "$h/invoices.v1.js" src/invoices/invoices.js
cp "$h/invoices-totals.v1.js" src/invoices/totals.js
cp "$tmp/final/src/invoices/ledger.js" src/invoices/ledger.js
cp "$tmp/final/src/app.js" src/app.js
cp "$tmp/final/src/http/routes.js" src/http/routes.js
cp "$tmp/final/scripts/export-ledger.js" scripts/export-ledger.js
cp "$tmp/final/test/invoices.test.js" test/invoices.test.js
readme_until '반품 전표'
commit "$(ago '75 days ago' -75d)" "feat(invoices): tax invoices and ledger csv export" \
  "VAT is rounded on every invoice line and the coupon discount is spread over the lines, so the printed lines add up to the invoice total (FIN-212). The amount keys follow the column order of the accounting import: supply, discount, vat, shipping, total."

# 3. 40일 전: 장바구니의 무료배송 판정만 쿠폰 전 금액으로.
cp "$tmp/final/src/cart/totals.js" src/cart/totals.js
commit "$(ago '40 days ago' -40d)" "feat(cart): free shipping banner follows list price (MKT-88)" \
  "The cart banner promises free shipping from 50,000 won of list price, before coupons. Order placement is unchanged."

# 4. 26일 전: 주문 접수에서 수량 검증.
cp "$tmp/final/src/orders/totals.js" src/orders/totals.js
cp "$tmp/final/test/order-validation.test.js" test/order-validation.test.js
commit "$(ago '26 days ago' -26d)" "fix(orders): reject zero, negative and fractional quantities" \
  "The cart keeps zero-quantity rows until the buyer removes them, so only order placement validates."

# 5. 15일 전: 반품 전표.
cp "$tmp/final/src/invoices/invoices.js" src/invoices/invoices.js
cp "$tmp/final/src/invoices/totals.js" src/invoices/totals.js
cp "$tmp/final/test/credit.test.js" test/credit.test.js
readme_until '배치 작업'
commit "$(ago '15 days ago' -15d)" "feat(invoices): credit notes for returns" \
  "Credit lines carry negative quantities. VAT on a credit line is rounded half away from zero so it cancels the original invoice line exactly, and a credit note carries no shipping."

# 6. 8일 전: 배치 작업과 대사(reconcile).
mkdir -p src/jobs config
cp "$tmp/final/src/jobs/runner.js" "$tmp/final/src/jobs/reconcile.js" src/jobs/
cp "$tmp/final/config/jobs.json" config/jobs.json
cp "$tmp/final/scripts/run-job.js" scripts/run-job.js
cp "$tmp/final/README.md" README.md
commit "$(ago '8 days ago' -8d)" "feat(jobs): nightly reconcile of order and invoice totals"

rm -rf "$tmp"
