# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-03 (PM 조율 — Task 19 부분 진행 중, Task 12 QA 최우선)

---

## 🔴 UX 개선 (Sanghun 직접 요청 — 최우선)

### ~~UX-1: 상품 등록 시 코드 자동 발급~~ ✅ 완료 (2026-04-03)

- `app/api/seller/products/route.ts` — 상품 등록 후 코드 1개 자동 발급 (24시간, 무제한 수량), 응답에 `autoCode` 포함
- `app/seller/products/new/page.tsx` — 등록 성공 시 "상품이 등록되었습니다!" + 코드 표시 + 복사 버튼 + 추가 발급 링크

### ~~UX-2: 코드 발급 시 QR코드 자동 생성~~ ✅ 완료 (2026-04-03, c0bb241)

**현재:** 코드 발급 → 텍스트 코드만 표시 (셀러가 코드를 읽어줘야 함)
**개선:** 코드 발급 시 QR코드 자동 생성 → 구매자가 QR 스캔하면 코드 입력까지 자동 완료

**동작:**
1. 셀러가 코드 발급 → QR코드 이미지 자동 생성
2. QR 내용: `https://liveorder.kr/order/{codeKey}` (코드가 URL에 포함)
3. 구매자가 QR 스캔 → 바로 상품 확인 페이지로 이동 (코드 입력 스킵)
4. 셀러는 QR을 라이브 방송 화면에 띄우면 됨

**구현:**
1. QR 생성 라이브러리 설치: `npm install qrcode`
2. `app/api/seller/codes/route.ts` 수정
   - 코드 생성 후 QR URL 함께 반환: `qrUrl: https://liveorder.kr/order/${codeKey}`
3. `app/seller/codes/new/page.tsx` 수정 (코드 발급 성공 화면)
   - QR코드 이미지 표시 (qrcode 라이브러리로 canvas/SVG 렌더링)
   - "QR 다운로드" 버튼 추가
   - 기존 "코드 복사" 버튼 유지
4. `app/seller/codes/page.tsx` (코드 목록)
   - 각 코드 옆에 QR 아이콘 → 클릭 시 QR 팝업
5. `app/(buyer)/order/[code]/page.tsx` 수정 (또는 신규 생성)
   - URL 파라미터에서 코드 자동 추출 → 코드 입력 페이지 스킵 → 바로 상품 확인
6. 현재 구매자 메인(`app/(buyer)/page.tsx`)의 코드 입력도 유지 (QR 없이 직접 입력하는 경우)

**참고:** QR에 포함되는 URL은 짧은 코드 기반이므로 별도 단축 URL 불필요

### UX-3: 코드 발급 시 상품 선택 드롭다운 표시 수정

**현재:** 상품 선택 후 SelectTrigger에 UUID가 표시될 수 있음
**개선:** 항상 "상품명 (₩가격)" 형식으로 표시

**구현:**
- `app/seller/codes/new/page.tsx` 130행
- `SelectItem`의 `value`는 `p.id` 유지 (API 전송용)
- `SelectValue`에 선택된 상품명이 보이도록 확인
- 현재 코드 확인: `SelectValue placeholder="상품을 선택하세요"` → shadcn Select는 SelectItem의 children 텍스트를 자동 표시하므로 정상일 수 있음
- **실제 화면에서 UUID가 보이는지 확인 후 수정** (SelectTrigger 렌더링 이슈일 수 있음)

---

## 🔴 Dev1 현재 할당 — Phase 1 배포까지

> **⚠️ 주의:** `prisma/schema.prisma`와 `app/api/cron/settlements/route.ts`에 Task 19 관련 변경사항이 uncommitted 상태임. Task 12 QA 완료 후 Task 19를 마저 완성해서 함께 커밋할 것.

### Task 12: 수동 QA 6개 항목 통과 ← **지금 당장 해야 할 일**

QA_REPORT.md "검증 필요 항목" 6개를 로컬 또는 스테이징에서 직접 확인.
각 항목 통과 시 QA_REPORT.md 해당 항목 옆에 ✅ 표기 + 날짜 기재.

**QA 항목:**
1. 결제 플로우: PortOne 테스트 결제창 → 서버 검증 → 주문 DB 생성 확인
2. 운송장 등록: PAID 주문 → Dialog → 제출 → SHIPPING 전환
3. 관리자 승인: 신규 셀러 → 관리자 승인 → **셀러 재로그인** → PENDING 배너 사라짐 확인
   > ⚠️ **B-18 주의:** JWT 세션은 재로그인 전까지 갱신 안 됨. 재로그인 과정 포함해서 확인.
4. 정산 크론: `Authorization: Bearer $CRON_SECRET` 헤더로 POST → Settlement 생성
5. 미들웨어: 비로그인 상태 `/seller/dashboard` 접근 → `/seller/login` 리다이렉트
6. 이미지 업로드: 5MB 초과 → 오류 메시지, 정상 이미지 → Blob URL 저장

**완료 조건:** QA_REPORT.md 6개 항목 모두 ✅ → PM에게 배포 승인 요청
**커밋:** `qa: Phase 1 수동 QA 6개 항목 통과 확인`

> Task 12 완료 후 바로 Task 19 나머지 구현 (API + UI) → Task 14 (Vercel 배포) 순서.

---

### ~~Task 15: 배포 전 빠른 픽스~~ ✅ 완료 (2026-04-03)

**~~B-19: 서버측 전화번호 형식 검증~~ ✅**
- `app/api/sellers/register/route.ts` — `phone` 필드 검증 추가
- `app/api/payments/confirm/route.ts` — `buyerPhone` 필드 검증 추가
  ```typescript
  const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
  if (!phoneRegex.test(phone)) return Response.json({ error: "연락처 형식 오류" }, { status: 400 });
  ```
- **커밋:** `fix: 서버측 전화번호 형식 검증 추가 (B-19)`

**~~B-20: 정산 배치 UX — alert() 제거~~ ✅**
- `app/admin/settlements/page.tsx:41-52` — `alert()` → inline 상태 메시지로 교체
  ```typescript
  // 기존 alert() 2곳 제거
  // useState<{type: 'success'|'error', message: string} | null> 추가
  // JSX에서 결과 메시지 렌더링 (성공: 초록, 실패: 빨강)
  ```
- **커밋:** `fix: 정산 배치 UX 개선 — alert() 제거, 오류 처리 추가 (B-20)`

---

### Task 14: Vercel 환경변수 확인 + 배포 (Task 12 완료 후)

1. Vercel 프로젝트 Settings → Environment Variables에서 7개 변수 설정 확인:
   - `DATABASE_URL`, `NEXTAUTH_SECRET`, `PORTONE_API_KEY`, `PORTONE_STORE_ID`
   - `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `NEXTAUTH_URL`
2. 미설정 항목 추가 후 Redeploy
3. 프로덕션 URL에서 QA 항목 1~6 재검증
4. **커밋:** `chore: 프로덕션 배포 확인 및 환경변수 체크 완료`

---

## 🟡 Phase 2 — 배포 완료 후 (우선순위 순)

### ~~Task 16: 관리자 주문 목록 + 환불 UI~~ ✅ 완료 (2026-04-03)

> REFUNDED 상태는 스키마에 이미 존재. 스키마 변경 불필요.

**신규 파일 3개:**

**① `app/admin/orders/page.tsx`** — 관리자 주문 목록 페이지
```typescript
// "use client"
// AdminShell 레이아웃 사용
// 상단: 상태 필터 셀렉트 (전체/PAID/SHIPPING/DELIVERED/REFUNDED)
// 테이블 컬럼: 주문번호(8자), 셀러명, 상품명, 구매자, 금액, 상태 Badge, 결제일, 액션
// PAID/SHIPPING/DELIVERED 행에 "환불" 버튼 → RefundDialog 열기
// 상태 Badge 색상: PAID=blue, SHIPPING=orange, DELIVERED=green, SETTLED=gray, REFUNDED=red
```

**② `components/admin/RefundDialog.tsx`** — 환불 처리 Dialog
```typescript
interface RefundDialogProps {
  order: { id: string; amount: number; buyerName: string; productName: string };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
// Dialog 내부:
// - 주문 정보 표시 (상품명, 구매자, 금액)
// - 환불 사유 textarea (필수, minLength=5)
// - 부분 환불 금액 input (선택, 미입력 시 전액 환불)
// - "환불 처리" 버튼 → POST /api/admin/orders/[id]/refund
// - 성공: onSuccess() 콜백 + 목록 갱신
// - 실패: 에러 메시지 인라인 표시
```

**③ `app/api/admin/orders/route.ts`** — GET 주문 목록
```typescript
// GET /api/admin/orders?status=&page=1
// adminAuth() 체크 필수
const orders = await prisma.order.findMany({
  where: { status: params.status ?? undefined },
  include: {
    code: {
      include: {
        product: { select: { name: true, seller: { select: { name: true } } } }
      }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 50,
  skip: (page - 1) * 50,
});
return Response.json({ orders, total });
```

**④ `app/api/admin/orders/[id]/refund/route.ts`** — POST 환불 처리
```typescript
// POST /api/admin/orders/[id]/refund
// body: { reason: string, amount?: number }
// 1. adminAuth() 확인
// 2. order 조회 → status 검증 (PAID/SHIPPING/DELIVERED만 가능)
// 3. PortOne API 호출:
//    fetch(`https://api.portone.io/payments/${order.pgTid}/cancel`, {
//      method: 'POST',
//      headers: { Authorization: `PortOne ${process.env.PORTONE_API_KEY}` },
//      body: JSON.stringify({ reason, cancelAmount: amount })
//    })
// 4. prisma.$transaction([
//      prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } }),
//      prisma.sellerAuditLog.create({ data: { action: 'REFUND', ... } })
//    ])
// 응답: { success: true, refundedAt: string }
```

**AdminShell 네비게이션 수정:** `components/admin/AdminShell.tsx`
- "주문 관리" 메뉴 항목 추가 (`/admin/orders`)

**커밋:** `feat: 관리자 주문 목록 + 환불 UI 구현 (P2-1)`

---

### ~~Task 17: 셀러 대시보드 최근 주문 데이터 표시~~ ✅ 완료 (2026-04-03)

**문제:** `app/seller/dashboard/page.tsx:98` — "아직 주문이 없습니다" placeholder 하드코딩 (B-22)

**① `app/api/seller/dashboard/route.ts` 수정** — `recentOrders` 추가
```typescript
// 기존 응답 객체에 추가
recentOrders: await prisma.order.findMany({
  where: {
    code: { product: { sellerId } },
    status: { not: 'REFUNDED' }
  },
  include: {
    code: { include: { product: { select: { name: true } } } }
  },
  orderBy: { createdAt: 'desc' },
  take: 5,
})
```

**② `app/seller/dashboard/page.tsx` 수정**
```typescript
// DashboardStats 인터페이스에 recentOrders 필드 추가
// "최근 주문" Card를 조건부 테이블로 교체:
//   - 데이터 있으면: 테이블 (주문번호 8자, 상품명, 금액, 상태 Badge, 날짜)
//   - 데이터 없으면: 기존 placeholder 텍스트
```

**커밋:** `feat: 셀러 대시보드 최근 주문 실데이터 표시 (B-22)`

---

### ~~Task 18: JWT 세션 갱신 UX 개선~~ ✅ 완료 (2026-04-03)

**문제:** 관리자가 셀러 승인 후 셀러 JWT 세션에 반영 안 됨. 재로그인 전까지 PENDING 배너 표시.

**① `app/api/seller/me/route.ts` 신규** — 실시간 셀러 상태 조회
```typescript
// GET /api/seller/me — 미들웨어 인증 통과 후
import { auth } from "@/lib/auth";
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const seller = await prisma.seller.findUnique({
    where: { id: session.user.id },
    select: { status: true, name: true }
  });
  return Response.json(seller);
}
```

**② `app/seller/dashboard/page.tsx` 수정** — PENDING 배너에 버튼 추가
```typescript
// PENDING 배너 내 "승인 확인" 버튼 추가
// 클릭 시:
//   1. GET /api/seller/me 호출
//   2. status === 'APPROVED'면 → signOut({ callbackUrl: '/seller/login?message=approved' })
//   3. status === 'PENDING'이면 → "아직 승인 대기 중입니다." 안내
async function checkApprovalStatus() {
  const res = await fetch('/api/seller/me');
  const data = await res.json();
  if (data.status === 'APPROVED') {
    await signOut({ callbackUrl: '/seller/login?message=approved' });
  } else {
    setCheckMessage('아직 승인 대기 중입니다. 관리자에게 문의하세요.');
  }
}
```

**③ `app/seller/auth/login/page.tsx` 수정** — 승인 안내 메시지 표시
```typescript
// URL searchParams에서 message=approved 감지
// → "승인되었습니다. 다시 로그인해주세요." 초록 배너 표시
```

**커밋:** `feat: 셀러 승인 후 세션 갱신 UX 개선 (B-18)`

---

### ~~Task 19: 정산 상세 드릴다운~~ ✅ 완료 (2026-04-03)

- `prisma/schema.prisma` — `Order.settlementId` FK + `Settlement.orders` 관계 추가
- `prisma/migrations/20260403000001_add_settlement_id_to_orders/` — 마이그레이션 SQL
- `app/api/cron/settlements/route.ts` — 정산 생성 시 `settlementId` 연결
- `app/api/seller/settlements/[id]/route.ts` — 정산 상세 API (포함 주문 포함)
- `components/seller/SettlementDetailDrawer.tsx` — Sheet 슬라이드아웃 컴포넌트
- `app/seller/settlements/page.tsx` — "상세 보기" 버튼 + Drawer 연결

**커밋:** `feat: 정산 상세 드릴다운 구현 (P2-3, B-06)`

---

## ✅ 완료된 작업

| 완료일 | 작업 | 커밋 |
|--------|------|------|
| 2026-04-03 | Task 19: 정산 상세 드릴다운 (P2-3, B-06) + UX-1: 상품 등록 시 코드 자동 발급 | (이번 커밋) |
| 2026-04-03 | B-19 서버 전화번호 검증, B-20 정산 배치 alert() 제거 + 인라인 메시지 | 6bcb637 |
| 2026-04-03 | Task 16: 관리자 주문 목록 + 환불 UI (P2-1) | 048ac72 |
| 2026-04-03 | Task 17+18: 셀러 대시보드 최근 주문 실데이터, 승인 세션 갱신 UX (B-22, B-18) | 49a984b |
| 2026-04-02 | B-15 결제 우회 엔드포인트 삭제, B-16 관리자 배치 인증 수정, B-17 비활성 상품 코드 발급 차단 | ac653d0 |
| 2026-04-02 | 미들웨어 HKDF salt 버그 수정 | 876bb02 |
| 2026-04-02 | 관리자 계정 DB seed 수정 | cc08f64 |
| 2026-04-02 | B-05 N+1 쿼리 최적화, B-08 재시도 버튼, B-09 새 코드 입력 버튼, .env.example | d77750f |
| 2026-04-02 | B-03 카테고리 미선택 UX, B-04 연락처 검증 (프론트) | b5c9043 |
| 2026-04-02 | B-01 크론 인증, B-02 레이스컨디션 수정 | 1485f74 |
| 2026-04-02 | debug 엔드포인트 제거, 상품 이미지 업로드 (Vercel Blob) | af0cc28 |
| 2026-04-02 | DELIVERED 상태, 상품 수정/삭제, 정산 필터 | cad9243 |
| 2026-04-02 | 운송장 UI, 코드 API 보안, PENDING 차단, 개인정보 동의 | afc5b54 |
| 2026-04-01 | 미들웨어 JWE 복호화, auth() 레이아웃 루프 수정 | 2c30a67 |
| 2026-04-01 | Neon HTTP 어댑터, Prisma 빌드 스크립트 | 3732637 |
| 초기 | 셀러/관리자 인증, 상품/코드/주문/정산 전체 플로우 | - |
