# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-02 (PM 조율 — 배포 직전 최종 단계, Phase 2 로드맵 추가)

---

## 🔴 Dev1 현재 할당 — 배포 완료까지 순서대로 진행

### Task 12: 수동 QA 6개 항목 통과 (진행 중)

QA_REPORT.md "검증 필요 항목" 6개를 로컬 또는 스테이징에서 직접 확인.
각 항목 통과 시 QA_REPORT.md 해당 항목 옆에 ✅ 표기 + 날짜 기재.

**QA 항목:**
1. 결제 플로우: PortOne 테스트 결제창 → 서버 검증 → 주문 DB 생성 확인
2. 운송장 등록: PAID 주문 → Dialog → 제출 → SHIPPING 전환
3. 관리자 승인: 신규 셀러 → 관리자 승인 → 셀러 PENDING 배너 사라짐
4. 정산 크론: `Authorization: Bearer $CRON_SECRET` 헤더로 POST → Settlement 생성
5. 미들웨어: 비로그인 상태 `/seller/dashboard` 접근 → `/seller/login` 리다이렉트
6. 이미지 업로드: 5MB 초과 → 오류 메시지, 정상 이미지 → Blob URL 저장

**완료 조건:** QA_REPORT.md 6개 항목 모두 ✅ → PM에게 배포 승인 요청
**커밋:** `qa: Phase 1 수동 QA 6개 항목 통과 확인`

---

### Task 14: Vercel 환경변수 확인 + 배포 (Task 12 완료 후)

**순서:**
1. Vercel 프로젝트 Settings → Environment Variables 접속
2. 아래 7개 변수 모두 설정 여부 확인:
   - `DATABASE_URL` — Neon PostgreSQL 연결 문자열
   - `NEXTAUTH_SECRET` — JWT 서명 키
   - `PORTONE_API_KEY` — PortOne V2 API 키
   - `PORTONE_STORE_ID` — PortOne 상점 ID
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob 토큰
   - `CRON_SECRET` — 정산 크론 Bearer 토큰
   - `NEXTAUTH_URL` — 프로덕션 URL
3. 미설정 항목 있으면 추가 후 Redeploy
4. 배포 완료 후 프로덕션 URL에서 QA 항목 1~6 재검증

**커밋:** `chore: 프로덕션 배포 확인 및 환경변수 체크 완료`

---

### Task 13: B-05 코드 검증 N+1 쿼리 최적화 (배포 후 처리 가능)

**우선순위:** MED (배포 후 다음 작업)

**파일:** `app/api/codes/[code]/route.ts`

**문제:** `include: { seller: true }`로 셀러를 가져온 후 status만 확인하는 별도 쿼리 존재 (N+1)

**수정 방법:**
```typescript
// 수정 전 (N+1):
const code = await prisma.code.findUnique({
  where: { code },
  include: { seller: true }
});
const seller = await prisma.seller.findUnique({ where: { id: code.sellerId } }); // 제거

// 수정 후 (단일 쿼리):
const code = await prisma.code.findUnique({
  where: { code },
  include: {
    seller: { select: { status: true, businessName: true } },
    products: true  // 기존 유지
  },
});
// 이후 code.seller.status로 직접 접근, 별도 seller 쿼리 삭제
```

**커밋:** `perf: 코드 검증 API N+1 쿼리 최적화 (B-05)`

---

## 🟡 Phase 2 다음 스프린트 (배포 완료 후)

### [P2-1] 환불/취소 처리 (HIGH)

**신규 파일:**
- `app/admin/orders/page.tsx` — 관리자 주문 목록 (주문번호, 구매자, 상품, 금액, 상태)
- `app/api/admin/orders/[id]/refund/route.ts` — PortOne cancelPayment 호출 + DB 업데이트

**스키마 변경 필요:**
```prisma
// prisma/schema.prisma
enum OrderStatus {
  // ... 기존 ...
  REFUNDED  // 추가
}
```
마이그레이션: `npx prisma migrate dev --name add_refunded_status`

**API 스펙:**
```typescript
// POST /api/admin/orders/[id]/refund
// body: { reason: string, amount?: number }
// 1. 관리자 인증 확인
// 2. PortOne API: POST https://api.portone.io/payments/{paymentId}/cancel
// 3. prisma: order.status = REFUNDED
// 4. AuditLog 기록 (action: "REFUND", targetId: orderId)
```

**UI:**
- 주문 목록 테이블에 PAID/SHIPPING/DELIVERED 상태 주문에 "환불" 버튼
- 클릭 → Dialog: 환불 사유 입력 → "환불 처리" → API 호출

---

### [P2-2] 구매자 채팅 오류 재시도 버튼 (B-08, MEDIUM)

**파일:** `app/(buyer)/chat/page.tsx`

**현재 문제:** 코드 검증 실패, 결제 실패 시 재시도 방법 없음

**구현:**
- 오류 상태 시 에러 메시지 아래 "다시 시도" 버튼 표시
- 코드 오류 → `setStep("code")`, 코드 state 초기화
- 결제 오류 → `setStep("payment")` (배송지 state 유지)

**커밋:** `feat: 채팅 결제/코드 오류 재시도 버튼 추가 (B-08)`

---

### [P2-3] 정산 상세 드릴다운 (B-06, MEDIUM)

**신규 파일:** `app/api/seller/settlements/[id]/route.ts`
```typescript
// GET /api/seller/settlements/[id]
const settlement = await prisma.settlement.findUnique({
  where: { id, sellerId: session.user.id },
  include: {
    orders: {
      include: { product: { select: { name: true } } }
    }
  }
});
```

**파일 수정:** `app/seller/settlements/page.tsx`
- Settlement 카드에 "상세 보기" 버튼 → Drawer 슬라이드아웃
- Drawer 내: 포함 주문 목록 (주문번호, 상품명, 금액, 결제일)

---

### [P2-4] 주문 완료 후 새 코드 입력 버튼 (B-09, MEDIUM)

**파일:** `components/buyer/cards/OrderConfirmation.tsx`

**구현:**
```tsx
// 주문 완료 화면 하단
<Button
  variant="outline"
  onClick={() => window.location.href = "/"}
  className="mt-4 w-full"
>
  새 코드 입력하기
</Button>
```

**커밋:** `feat: 주문 완료 후 새 코드 입력 버튼 추가 (B-09)`

---

### [P2-5] .env.example 업데이트 (기술 부채)

**파일:** `.env.example` (루트)

현재 PortOne, Blob 관련 변수 누락. 신규 기여자/배포 시 참조용.

**추가할 내용:**
```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# PortOne
PORTONE_API_KEY=your-portone-api-key
PORTONE_STORE_ID=your-store-id

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Cron
CRON_SECRET=your-cron-secret
```

**커밋:** `chore: .env.example PortOne/Blob/Cron 변수 추가`

---

## ✅ Dev1 완료 — Phase 1 전체

### Phase 1 완료 목록 (역순)

| 완료일 | 작업 | 커밋 |
|--------|------|------|
| 2026-04-02 | B-03 카테고리 미선택 UX, B-04 연락처 검증 | b5c9043 |
| 2026-04-02 | B-01 크론 인증, B-02 레이스컨디션 수정 | 1485f74 |
| 2026-04-02 | debug 엔드포인트 제거, 상품 이미지 업로드 (Vercel Blob) | af0cc28 |
| 2026-04-02 | DELIVERED 상태, 상품 수정/삭제, 정산 필터 | cad9243 |
| 2026-04-02 | 운송장 UI, 코드 API 보안, PENDING 차단, 개인정보 동의 | afc5b54 |
| 2026-04-01 | 미들웨어 JWE 복호화, auth() 레이아웃 루프 수정 | 2c30a67 |
| 2026-04-01 | Neon HTTP 어댑터, Prisma 빌드 스크립트 | 3732637 |
| 초기 | 셀러/관리자 인증, 상품/코드/주문/정산 전체 플로우 | - |
