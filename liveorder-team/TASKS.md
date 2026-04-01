# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-02

---

## Dev1 (현재 작업) — Critical Fixes

### Task 1: 운송장 등록 UI 구현
**우선순위:** P0 (즉시)
**파일:**
- `app/seller/orders/page.tsx` — 운송장 등록 버튼 + Dialog 추가

**구현 상세:**
1. 각 주문 행의 "운송장" 열에 등록 버튼 추가 (status가 `PAID` 또는 `SHIPPING`일 때)
2. Dialog 컴포넌트:
   - 택배사 Select: CJ대한통운, 로젠택배, 한진택배, 롯데택배, 우체국택배
   - 운송장번호 Input (숫자만, 10~15자리)
   - "등록" / "취소" 버튼
3. 제출 시: `POST /api/seller/orders/{orderId}/tracking` 호출
   - body: `{ carrier: string, trackingNo: string }`
4. 성공 시: Dialog 닫기, 주문 목록 갱신 (해당 주문의 trackingNo/carrier 업데이트)
5. API 수정: `app/api/seller/orders/[id]/tracking/route.ts` — 주문 status도 `SHIPPING`으로 변경

**참고:** Dialog 컴포넌트는 이미 `components/ui/dialog.tsx`에 있음

---

### Task 2: 코드 발급 API 보안 수정
**우선순위:** P0 (즉시)
**파일:**
- `app/api/seller/codes/route.ts` — POST 핸들러 추가 (기존 GET 옆에)
- `app/api/codes/route.ts` — POST 핸들러 제거
- `app/seller/codes/new/page.tsx` — fetch URL 변경: `/api/codes` → `/api/seller/codes`

**구현 상세:**
1. `app/api/codes/route.ts`에서 POST 함수 전체를 복사
2. `app/api/seller/codes/route.ts`에 POST 추가
   - 미들웨어가 `/api/seller/*`를 보호하므로 추가 인증 불필요
   - 셀러 세션에서 sellerId 추출하여 상품 소유권 확인
3. `app/api/codes/route.ts`에서 POST export 제거
4. 프론트엔드 URL 수정

---

### Task 3: 셀러 PENDING 상태 차단
**우선순위:** P0 (즉시)
**파일:**
- `app/api/seller/products/route.ts` — POST에 셀러 상태 확인 추가
- `app/api/seller/codes/route.ts` — POST에 셀러 상태 확인 추가 (Task 2 완료 후)
- `app/seller/dashboard/page.tsx` — PENDING 배너 추가

**구현 상세:**
1. 상품 등록 API에서:
```typescript
// session에서 셀러 ID 가져온 후
const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
if (seller?.status !== 'APPROVED') {
  return NextResponse.json(
    { error: '관리자 승인 후 이용 가능합니다. 승인 대기 중입니다.' },
    { status: 403 }
  );
}
```
2. 대시보드에 배너:
```tsx
{sellerStatus === 'PENDING' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
    <p className="font-medium">승인 대기 중</p>
    <p className="text-sm">관리자 승인 후 상품 등록 및 코드 발급이 가능합니다.</p>
  </div>
)}
```

---

### Task 4: 개인정보 제3자 제공 동의
**우선순위:** P0 (즉시)
**파일:**
- `components/buyer/cards/AddressForm.tsx` — 동의 체크박스 추가

**구현 상세:**
1. 폼 하단, 제출 버튼 위에 체크박스 추가:
```tsx
<div className="flex items-start gap-2">
  <input
    type="checkbox"
    id="privacyConsent"
    checked={consent}
    onChange={(e) => setConsent(e.target.checked)}
    className="mt-1"
  />
  <label htmlFor="privacyConsent" className="text-xs text-muted-foreground">
    배송 처리를 위해 수령인명, 배송주소, 연락처를 판매자에게 제공하는 것에 동의합니다.
    (동의하지 않으면 구매를 진행할 수 없습니다.)
  </label>
</div>
```
2. `consent` 상태가 false이면 제출 버튼 disabled

---

## Dev1 (다음 작업) — P1 Tasks

### Task 5: OrderStatus에 DELIVERED 추가
**파일:**
- `prisma/schema.prisma` — OrderStatus enum에 `DELIVERED` 추가 (SHIPPING과 SETTLED 사이)
- 마이그레이션 실행: `npx prisma migrate dev --name add_delivered_status`
- `app/seller/orders/page.tsx` — statusMap에 DELIVERED 추가
- `app/(buyer)/lookup/page.tsx` — statusLabel에 DELIVERED 추가

### Task 6: 상품 수정/삭제 기능
**파일:**
- `app/api/seller/products/[id]/route.ts` — 새 파일 생성
  - `PUT`: 상품 정보 수정 (name, description, price, stock, category)
  - `DELETE`: soft delete (isActive = false)
- `app/seller/products/page.tsx` — 수정/삭제 버튼 추가
- `app/seller/products/[id]/edit/page.tsx` — 상품 수정 페이지 (new/page.tsx 기반)

### Task 7: 셀러 정산 페이지 점검/구현
**파일:** `app/seller/settlements/page.tsx`
- 정산 목록 테이블 (날짜, 금액, 수수료, 실지급액, 상태)
- 상태별 필터 (전체, 대기, 완료)
- 합계 표시 (총 정산액, 총 수수료, 총 실지급액)

---

## 완료된 작업

- [x] Next.js 16 + TypeScript + Tailwind 프로젝트 초기화
- [x] Prisma 스키마 설계 (Admin, Seller, Product, Code, Order, Settlement, AuditLog)
- [x] Neon HTTP 어댑터 연동
- [x] NextAuth v5 셀러/관리자 이중 인증
- [x] 미들웨어 JWE 토큰 복호화 (HKDF)
- [x] 셀러 회원가입 (`app/seller/auth/register/page.tsx`)
- [x] 셀러 로그인 (`app/seller/auth/login/page.tsx`)
- [x] 관리자 로그인 (`app/admin/auth/login/page.tsx`)
- [x] 상품 등록 (`app/seller/products/new/page.tsx`)
- [x] 상품 목록 (`app/seller/products/page.tsx`)
- [x] 코드 발급 (`app/seller/codes/new/page.tsx`)
- [x] 코드 관리 — 토글 활성화/비활성화 (`app/seller/codes/page.tsx`)
- [x] 구매자 코드 입력 랜딩 (`app/(buyer)/page.tsx`)
- [x] 구매자 채팅 UI + Zustand 스토어 (`app/(buyer)/chat/page.tsx`)
- [x] 채팅 카드 컴포넌트 (ProductCard, QuantitySelector, AddressForm, PaymentSummary, OrderConfirmation)
- [x] PortOne 결제 연동 + 서버 검증 (`app/api/payments/confirm/route.ts`)
- [x] 주문 생성 트랜잭션 (주문 + 코드 수량 업데이트)
- [x] 주문 조회 — 비회원 (`app/(buyer)/lookup/page.tsx`)
- [x] 셀러 주문 관리 + CSV 다운로드 (`app/seller/orders/page.tsx`)
- [x] 셀러 대시보드 통계 (`app/seller/dashboard/page.tsx`)
- [x] 관리자 대시보드 (`app/admin/dashboard/page.tsx`)
- [x] 관리자 셀러 관리 — 승인/거부/정지 (`app/admin/sellers/page.tsx`)
- [x] 관리자 정산 조회 (`app/admin/settlements/page.tsx`)
- [x] 정산 크론 잡 (`app/api/cron/settlements/route.ts`)
- [x] 이용약관 + 개인정보처리방침 (`app/(buyer)/terms/`)
- [x] 법적 중개자 고지문 (PaymentSummary에 포함)
- [x] bcrypt 비용 최적화 (Vercel 서버리스 타임아웃 대응)
- [x] 미들웨어 번들 크기 최적화 (Vercel 1MB 엣지 제한)
- [x] auth() 레이아웃 리다이렉트 루프 수정
