# LIVEORDER 개발 계획서

> 최종 업데이트: 2026-04-02 (PM 조율 — Phase 1 QA 막바지, Phase 2 상세 스펙 추가)
> 현재 단계: **Phase 1 MVP — 수동 QA 완료 → Vercel 배포 → Phase 2 개발 착수**

---

## 1. Phase 1 MVP 완료 현황

### 구현 완료 기능 (전체)

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로젝트 인프라 (Next.js 16 + Prisma + Neon + Vercel) | ✅ | |
| DB 스키마 (Admin, Seller, Product, Code, Order, Settlement, AuditLog) | ✅ | |
| 셀러 회원가입 / 로그인 | ✅ | |
| 관리자 로그인 | ✅ | |
| 미들웨어 인증 (HKDF JWE 복호화) | ✅ | 876bb02 salt 버그 수정 포함 |
| 상품 등록/수정/삭제/목록 | ✅ | soft delete |
| 상품 이미지 업로드 (Vercel Blob) | ✅ | 5MB 제한 |
| 코드 발급/관리 + API 보안 | ✅ | `/api/seller/codes` |
| 셀러 PENDING 차단 | ✅ | 상품/코드 API |
| 비활성 상품 코드 발급 차단 (B-17) | ✅ | |
| 구매자 코드 입력 → 채팅 플로우 | ✅ | |
| PortOne 결제 연동 + 서버 검증 | ✅ | |
| 동시 주문 레이스 컨디션 방지 (B-02) | ✅ | 원자적 UPDATE |
| 결제 우회 엔드포인트 제거 (B-15) | ✅ | `/api/orders` 삭제 |
| 주문 조회 (비회원, 전화번호+주문번호) | ✅ | |
| 배송지 입력 + 개인정보 동의 체크박스 | ✅ | |
| 셀러 주문 관리 + CSV 다운로드 | ✅ | UTF-8 BOM |
| 운송장 등록 UI (Dialog) | ✅ | PAID→SHIPPING |
| OrderStatus DELIVERED | ✅ | 마이그레이션 완료 |
| OrderStatus REFUNDED | ✅ | 마이그레이션 완료 (Phase 2 UI 필요) |
| 셀러 대시보드 (통계 카드) | ✅ | 최근 주문은 placeholder (B-22) |
| 셀러 정산 페이지 (목록 + 필터 + 합계) | ✅ | |
| 관리자 셀러 승인/거부/정지 + 감사 로그 | ✅ | |
| 관리자 정산 조회 + 배치 버튼 | ✅ | B-16 인증 수정 완료 |
| 정산 크론 (D+3, CRON_SECRET 인증) | ✅ | |
| debug 엔드포인트 제거 | ✅ | |
| 카테고리 UX 피드백 (B-03) | ✅ | |
| 연락처 형식 검증 프론트엔드 (B-04) | ✅ | |
| 이용약관 + 개인정보처리방침 | ✅ | |
| 채팅 오류 재시도 버튼 (B-08) | ✅ | |
| 주문 완료 후 새 코드 입력 버튼 (B-09) | ✅ | |
| 코드 검증 N+1 쿼리 최적화 (B-05) | ✅ | |

### 배포 전 잔여 항목

| 항목 | 상태 | 담당 |
|------|------|------|
| 수동 QA 6개 항목 통과 | 🔄 진행 중 | Dev1 Task 12 |
| B-19: 전화번호 서버측 검증 | 선택 (LOW) | Dev1 Task 15 |
| B-20: 정산 배치 alert() 제거 | 선택 (LOW) | Dev1 Task 15 |
| Vercel 환경변수 7개 확인 + 배포 | ⏳ QA 완료 후 | Dev1 Task 14 |

---

## 2. 배포 직전 체크리스트

### 2.1 수동 QA 6개 항목 (Task 12)

| # | 항목 | 방법 |
|---|------|------|
| QA-1 | 결제 플로우 | PortOne 테스트 결제창 → 서버 검증 → Order 생성 DB 확인 |
| QA-2 | 운송장 등록 | PAID 주문 → Dialog → 제출 → SHIPPING 상태 전환 |
| QA-3 | 관리자 셀러 승인 | 신규 셀러 → 관리자 승인 → **셀러 재로그인** → PENDING 배너 사라짐 ⚠️ B-18 |
| QA-4 | 정산 크론 | `POST /api/cron/settlements` (Bearer $CRON_SECRET) → Settlement 생성 |
| QA-5 | 미들웨어 인증 | 비로그인 `/seller/dashboard` 접근 → `/seller/login` 리다이렉트 |
| QA-6 | 이미지 업로드 | 5MB 초과 → 오류, 정상 이미지 → Vercel Blob URL 저장 |

### 2.2 Vercel 환경변수 7개

| 변수명 | 설명 |
|--------|------|
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 |
| `NEXTAUTH_SECRET` | JWT 서명 키 (32자 이상) |
| `PORTONE_API_KEY` | PortOne V2 API 키 |
| `PORTONE_STORE_ID` | PortOne 상점 ID |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 토큰 |
| `CRON_SECRET` | 정산 크론 Bearer 토큰 |
| `NEXTAUTH_URL` | 프로덕션 URL |

---

## 3. Phase 2 로드맵 (MVP 배포 후)

### 우선순위 HIGH

#### 3.1 관리자 주문 목록 + 환불 UI (P2-1)

**배경:** `OrderStatus.REFUNDED`는 스키마에 이미 존재. UI와 API만 구현하면 됨.

**신규 파일:**

`app/admin/orders/page.tsx` — 관리자 주문 목록
```typescript
// 컴포넌트 구조
// <AdminShell>
//   <div> 헤더 (제목 + 필터: 상태 셀렉트, 날짜 범위)
//   <Card> 주문 테이블
//     컬럼: 주문번호(8자), 구매자명, 상품명, 금액, 상태 Badge, 결제일, 액션
//     PAID/SHIPPING/DELIVERED 상태에 "환불" 버튼 표시
//   <RefundDialog> 환불 사유 입력 Dialog
```

`app/api/admin/orders/route.ts` — 주문 목록 GET
```typescript
// GET /api/admin/orders?status=PAID&page=1
// 인증: adminAuth() 체크
// 응답: { orders: [...], total: number }
const orders = await prisma.order.findMany({
  where: { status: params.status ?? undefined },
  include: {
    code: {
      include: {
        product: { select: { name: true } },
        seller: { select: { name: true } }
      }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 50,
  skip: (page - 1) * 50,
});
```

`app/api/admin/orders/[id]/refund/route.ts` — 환불 처리 POST
```typescript
// POST /api/admin/orders/[id]/refund
// body: { reason: string, amount?: number }
// 1. 관리자 인증 확인
// 2. Order 조회 + status PAID/SHIPPING/DELIVERED 확인
// 3. PortOne cancelPayment API 호출:
//    POST https://api.portone.io/payments/{pgTid}/cancel
//    body: { reason, cancelAmount? }
// 4. prisma.$transaction([
//      order.update(status: REFUNDED, memo: reason),
//      SellerAuditLog.create(action: "REFUND")
//    ])
// 응답: { success: true, refundedAt: Date }
```

**RefundDialog 컴포넌트:** `components/admin/RefundDialog.tsx`
- Props: `orderId`, `orderInfo`, `isOpen`, `onClose`, `onSuccess`
- 환불 사유 textarea (필수)
- 부분 환불 금액 input (선택, 미입력 시 전액)
- "환불 처리" 버튼 → 로딩 상태 → 성공/실패 토스트

---

### 우선순위 MEDIUM

#### 3.2 정산 상세 드릴다운 (P2-3, B-06)

**주의: 스키마 변경 필요.** 현재 Order→Settlement 외래키 없음.

**스키마 변경:**
```prisma
// prisma/schema.prisma — Order 모델에 추가
model Order {
  // ... 기존 필드 ...
  settlementId  String?  @map("settlement_id") @db.Uuid  // 추가

  code       Code        @relation(fields: [codeId], references: [id])
  settlement Settlement? @relation(fields: [settlementId], references: [id])  // 추가
}

model Settlement {
  // ... 기존 필드 ...
  orders Order[]  // 추가
}
```

마이그레이션: `npx prisma migrate dev --name add_settlement_id_to_orders`

**크론 수정 필요:**
`app/api/cron/settlements/route.ts` — Settlement 생성 후 포함 주문에 `settlementId` 업데이트 추가

**신규 API:**
`app/api/seller/settlements/[id]/route.ts`
```typescript
// GET /api/seller/settlements/[id]
const settlement = await prisma.settlement.findUnique({
  where: { id, sellerId: session.user.id },
  include: {
    orders: {
      include: { code: { include: { product: { select: { name: true } } } } }
    }
  }
});
// 응답: Settlement + orders[]
```

**UI 수정:**
`app/seller/settlements/page.tsx` — Settlement 카드에 "상세 보기" 버튼 추가
- `components/seller/SettlementDetailDrawer.tsx` 신규 생성
  - Drawer (Radix UI sheet) 슬라이드아웃
  - 포함 주문 목록 테이블: 주문번호, 상품명, 구매자, 금액, 결제일

#### 3.3 JWT 세션 갱신 UX 개선 (B-18)

**문제:** 관리자가 셀러 승인 후 셀러 대시보드의 PENDING 배너가 재로그인 전까지 유지됨.

**현실적 해결책 (복잡한 세션 무효화 없이):**

`app/seller/dashboard/page.tsx` 수정:
```typescript
// PENDING 배너에 "승인 확인" 버튼 추가
// 클릭 → /api/seller/me 호출 → status === APPROVED면 signOut() 후 /seller/login?message=approved 리다이렉트
// /seller/login 페이지에서 message=approved일 때 "승인되었습니다. 다시 로그인해주세요" 안내 표시
```

`app/api/seller/me/route.ts` 신규:
```typescript
// GET /api/seller/me — 현재 셀러 DB 상태 조회 (실시간)
// 응답: { status: SellerStatus }
```

#### 3.4 셀러 대시보드 최근 주문 데이터 표시 (B-22)

**문제:** `app/seller/dashboard/page.tsx:98-101` — "아직 주문이 없습니다" placeholder 하드코딩.

**API 수정:**
`app/api/seller/dashboard/route.ts` — `recentOrders` 필드 추가
```typescript
// 기존 응답에 추가
recentOrders: await prisma.order.findMany({
  where: {
    code: { product: { sellerId: session.user.id } },
    status: { not: 'REFUNDED' }
  },
  include: { code: { include: { product: { select: { name: true } } } } },
  orderBy: { createdAt: 'desc' },
  take: 5,
})
```

**UI 수정:**
`app/seller/dashboard/page.tsx` — "최근 주문" 카드를 실제 데이터 테이블로 교체
- 컬럼: 주문번호, 상품명, 구매자, 금액, 상태 Badge, 결제일
- 데이터 없으면 기존 placeholder 유지

---

### 우선순위 LOW

#### 3.5 B-19: 전화번호 서버측 검증

**파일:** `app/api/sellers/register/route.ts`, `app/api/payments/confirm/route.ts`
```typescript
const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
if (!phoneRegex.test(phone)) {
  return Response.json({ error: "연락처 형식이 올바르지 않습니다." }, { status: 400 });
}
```

#### 3.6 B-20: 정산 배치 alert() 제거

**파일:** `app/admin/settlements/page.tsx:41-52`
- `useState<string | null>` 메시지 상태 추가
- `alert()` 제거 → 인라인 상태 메시지 또는 shadcn toast로 교체
- `res.ok` 체크하여 실패 시 오류 메시지 표시

#### 3.7 B-21: 목록 API 페이지네이션

**대상 API:** orders, products, codes, settlements (셀러/관리자 모두)
- `?page=1&limit=50` 파라미터 추가
- 응답: `{ data: [...], total: number, page: number, totalPages: number }`
- UI: 테이블 하단 페이지 네비게이션 컴포넌트

---

## 4. DB 스키마 현황 (2026-04-02 기준)

```
Admin, Seller, Product, Code, Order, Settlement, SellerAuditLog
OrderStatus: PAID | SHIPPING | DELIVERED | SETTLED | REFUNDED ✅
SettlementStatus: PENDING | COMPLETED | FAILED
SellerStatus: PENDING | APPROVED | SUSPENDED
```

**Phase 2에서 필요한 스키마 변경:**
- P2-3: `Order.settlementId` FK 추가 → `npx prisma migrate dev --name add_settlement_id_to_orders`

---

## 5. 기술 부채 현황

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| B-18: JWT 세션 미갱신 UX | MED | Phase 2 (3.3) |
| B-19: 전화번호 서버측 검증 | LOW | Phase 2 (3.5) |
| B-20: 정산 배치 alert() | LOW | Phase 2 (3.6) |
| B-21: 목록 API 페이지네이션 | LOW | Phase 2 (3.7) |
| B-22: 대시보드 최근 주문 | LOW | Phase 2 (3.4) |
| buyer-store `Record<string, unknown>` 타입 | LOW | 미처리 |
| Redis 캐싱 (코드 조회) | LOW | MVP 이후 |
| 이메일 알림 (주문접수/정산완료) | LOW | MVP 이후 |
| 택배사 API 배송 추적 | LOW | MVP 이후 |
