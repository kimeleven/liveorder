# LIVEORDER 개발 계획서

> 최종 업데이트: 2026-04-02 (PM 조율 — B-15/B-16/B-17 보안 수정 완료, HKDF salt 버그 수정, QA 진행 중)
> 현재 단계: **Phase 1 MVP — 수동 QA 6개 항목 통과 → Vercel 배포**

---

## 1. 현재 상태 평가

### Phase 1 MVP 구현 완료 기능

| 기능 | 상태 | 커밋 |
|------|------|------|
| 프로젝트 인프라 (Next.js 16 + Prisma + Neon + Vercel) | ✅ 완료 | 초기 |
| DB 스키마 (Admin, Seller, Product, Code, Order, Settlement, AuditLog) | ✅ 완료 | 초기 |
| 셀러 회원가입 / 로그인 | ✅ 완료 | 초기 |
| 관리자 로그인 | ✅ 완료 | 초기 |
| 미들웨어 인증 (HKDF JWE 복호화) | ✅ 완료 | 2c30a67 |
| 상품 등록/목록 (`app/seller/products/`) | ✅ 완료 | 초기 |
| 상품 수정/삭제 (`app/api/seller/products/[id]`) | ✅ 완료 | cad9243 |
| 상품 이미지 업로드 (Vercel Blob) | ✅ 완료 | af0cc28 |
| 코드 발급/관리 (`app/seller/codes/`) | ✅ 완료 | 초기 |
| 코드 발급 API 보안 (`/api/seller/codes`) | ✅ 완료 | afc5b54 |
| 셀러 PENDING 차단 (상품/코드 API) | ✅ 완료 | afc5b54 |
| 구매자 코드 입력 → 채팅 플로우 | ✅ 완료 | 초기 |
| PortOne 결제 연동 + 서버 검증 | ✅ 완료 | 초기 |
| 주문 생성 트랜잭션 (원자적 수량 검증) | ✅ 완료 | 1485f74 |
| 주문 조회 (비회원, 전화번호+주문번호) | ✅ 완료 | 초기 |
| 배송지 입력 + 개인정보 동의 체크박스 | ✅ 완료 | afc5b54 |
| 연락처 형식 검증 (B-04) | ✅ 완료 | b5c9043 |
| 카테고리 미선택 UX 피드백 (B-03) | ✅ 완료 | b5c9043 |
| 셀러 주문 관리 + CSV 다운로드 | ✅ 완료 | 초기 |
| 운송장 등록 UI (Dialog, PAID/SHIPPING) | ✅ 완료 | afc5b54 |
| OrderStatus DELIVERED 추가 + 마이그레이션 | ✅ 완료 | cad9243 |
| 셀러 대시보드 (통계) | ✅ 완료 | 초기 |
| 셀러 정산 페이지 (목록 + 필터 + 합계) | ✅ 완료 | cad9243 |
| 관리자 셀러 승인/거부/정지 + 감사 로그 | ✅ 완료 | 초기 |
| 관리자 정산 조회 | ✅ 완료 | 초기 |
| 정산 크론 (D+3, CRON_SECRET 인증) | ✅ 완료 | 1485f74 |
| debug 엔드포인트 제거 (보안) | ✅ 완료 | af0cc28 |
| 결제 우회 엔드포인트 제거 (B-15) | ✅ 완료 | ac653d0 |
| 관리자 정산 배치 인증 수정 (B-16) | ✅ 완료 | ac653d0 |
| 비활성 상품 코드 발급 차단 (B-17) | ✅ 완료 | ac653d0 |
| 미들웨어 HKDF salt 버그 수정 | ✅ 완료 | 876bb02 |
| 관리자 계정 DB seed 누락 수정 | ✅ 완료 | cc08f64 |
| 이용약관 + 개인정보처리방침 | ✅ 완료 | 초기 |
| 법적 중개자 고지문 (PaymentSummary) | ✅ 완료 | 초기 |

---

## 2. 배포 직전 체크리스트

### 2.1 수동 QA 6개 항목 (Task 12)

QA_REPORT.md "검증 필요 항목" 섹션 기준. 각 항목 통과 시 ✅ 마킹.

| # | 항목 | 방법 |
|---|------|------|
| QA-1 | 결제 플로우 | PortOne 테스트 결제창 → 서버 검증 → Order 생성 DB 확인 |
| QA-2 | 운송장 등록 | PAID 주문 → Dialog → 제출 → SHIPPING 상태 전환 확인 |
| QA-3 | 관리자 셀러 승인 | 신규 셀러 → 관리자 승인 → **셀러 재로그인** → 대시보드 PENDING 배너 사라짐 ⚠️ B-18: JWT 세션 재로그인 후 갱신 |
| QA-4 | 정산 크론 | POST `/api/cron/settlements` (Authorization: Bearer $CRON_SECRET) → Settlement 생성 확인 |
| QA-5 | 미들웨어 인증 | 비로그인 상태 `/seller/dashboard` 접근 → `/seller/login` 리다이렉트 |
| QA-6 | 이미지 업로드 | 5MB 초과 → 오류, 정상 이미지 → Vercel Blob URL 저장 확인 |

**모두 통과 → 배포 진행.**

### 2.2 Vercel 환경변수 확인 체크리스트

배포 전 Vercel 프로젝트 Settings → Environment Variables에서 아래 항목 모두 설정 확인:

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL 연결 문자열 |
| `NEXTAUTH_SECRET` | ✅ | NextAuth JWT 서명 키 (32자 이상 랜덤) |
| `PORTONE_API_KEY` | ✅ | PortOne V2 API 키 |
| `PORTONE_STORE_ID` | ✅ | PortOne 상점 ID |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel Blob 토큰 |
| `CRON_SECRET` | ✅ | 정산 크론 인증 Bearer 토큰 |
| `NEXTAUTH_URL` | ✅ | 프로덕션 URL (e.g. `https://liveorder.vercel.app`) |

---

## 3. Task 13 상세 스펙 — B-05 N+1 쿼리 최적화

**파일:** `app/api/codes/[code]/route.ts` (라인 60-72 근처)

**문제:** `seller`를 include로 가져온 후 status 확인을 위해 별도 쿼리 실행 (N+1 패턴)

**수정 전 (문제):**
```typescript
const code = await prisma.code.findUnique({
  where: { code },
  include: { seller: true }
});
const seller = await prisma.seller.findUnique({ where: { id: code.sellerId } }); // 중복 쿼리
```

**수정 후 (단일 쿼리):**
```typescript
const code = await prisma.code.findUnique({
  where: { code },
  include: {
    seller: {
      select: { status: true, businessName: true }
    },
    products: true  // 기존 include 유지
  },
});

// 별도 seller 쿼리 제거 후 code.seller.status 직접 참조
if (code.seller.status !== "APPROVED") {
  return Response.json({ error: "비활성화된 셀러" }, { status: 403 });
}
```

**커밋:** `perf: 코드 검증 API N+1 쿼리 최적화 (B-05)`

---

## 4. Phase 2 로드맵 (MVP 배포 후 다음 스프린트)

### 우선순위 HIGH

#### 4.1 환불/취소 처리 (관리자 UI)

**배경:** 현재 환불은 수동으로 PortOne 대시보드에서 처리. 관리자가 웹에서 직접 처리해야 함.

**필요 파일:**
- `app/admin/orders/page.tsx` — 관리자 주문 목록 (현재 미구현)
- `app/api/admin/orders/[id]/refund/route.ts` — PortOne 환불 API 호출
- `prisma/schema.prisma` — `OrderStatus`에 `REFUNDED` 추가, 마이그레이션 필요

**API 스펙:**
```typescript
// POST /api/admin/orders/[id]/refund
// body: { reason: string, amount?: number }
// 1. PortOne cancelPayment API 호출
// 2. Order status → REFUNDED
// 3. AuditLog 기록
// 응답: { success: true, refundedAt: Date }
```

**UI 스펙:**
- 관리자 주문 목록 테이블: 주문번호, 구매자, 상품, 금액, 상태, 결제일
- PAID/SHIPPING/DELIVERED 상태 주문에 "환불" 버튼
- 환불 사유 입력 Dialog → 확인 → 처리

#### ~~4.2 구매자 채팅 오류 재시도 버튼 (B-08)~~ ✅ 완료 (2026-04-02)

`components/buyer/ChatMessage.tsx`에 `retryAction` 필드 기반 "다시 시도" 버튼 추가 완료.
코드 오류 → idle 초기화, 결제 오류 → payment_pending 복원.

### 우선순위 MEDIUM

#### 4.3 정산 상세 드릴다운 (B-06)

**파일:** `app/seller/settlements/page.tsx`

**현재:** 정산 목록만 있음. 각 정산의 포함 주문 내역 없음.

**구현:**
- Settlement 카드 클릭 → Drawer/Dialog 슬라이드아웃
- 포함 주문 목록: 주문번호, 구매자, 상품, 금액, 결제일
- `GET /api/seller/settlements/[id]` 엔드포인트 신규 (include: orders)

**API 스펙:**
```typescript
// GET /api/seller/settlements/[id]
// 응답: Settlement + { orders: Order[] }
const settlement = await prisma.settlement.findUnique({
  where: { id, sellerId: session.user.id },
  include: { orders: { include: { product: true } } }
});
```

#### ~~4.4 주문 완료 후 새 코드 입력 버튼 (B-09)~~ ✅ 완료 (2026-04-02)

`components/buyer/cards/OrderConfirmation.tsx` 하단에 "새 코드 입력하기" 버튼 추가 완료.
클릭 시 `window.location.href = "/"` 이동.

### 우선순위 LOW

#### 4.5 셀러 대시보드 차트

**파일:** `app/seller/dashboard/page.tsx`

**구현:** Recharts 또는 shadcn/ui chart 컴포넌트
- 최근 7일/30일 주문 건수 바 차트
- 코드별 주문 건수 파이 차트
- `GET /api/seller/stats` (기간 파라미터)

#### 4.6 이메일 알림

**기술:** Resend (간단한 API, Next.js 친화적)
- 주문 접수 시 → 셀러 이메일 알림
- 정산 완료 시 → 셀러 이메일 알림
- `lib/email.ts` — Resend 클라이언트 래퍼

#### 4.7 구매자 데이터 삭제권 (GDPR/개인정보보호법)

**필요 작업:**
- `DELETE /api/buyer/data` — 주문 내 개인정보(이름, 전화번호, 주소) 마스킹 처리
- 주문 조회 페이지에 "개인정보 삭제 요청" 버튼

---

## 5. 기술 부채 (Phase 2에서 처리)

| 항목 | 우선순위 | 현재 상태 |
|------|----------|-----------|
| B-05: 코드 검증 N+1 쿼리 | MED | ✅ 완료 (2026-04-02) |
| `.env.example` PortOne/Blob 변수 추가 | MED | ✅ 완료 (2026-04-02) |
| B-15: 결제 우회 엔드포인트 제거 | HIGH | ✅ 완료 (2026-04-02) |
| B-16: 관리자 정산 배치 인증 수정 | HIGH | ✅ 완료 (2026-04-02) |
| B-17: 비활성 상품 코드 발급 차단 | MED | ✅ 완료 (2026-04-02) |
| B-18: 셀러 승인 후 JWT 세션 미갱신 | MED | 미처리 (재로그인 필요 안내로 우선 대응) |
| B-19: 전화번호 서버측 검증 없음 | LOW | Task 15 (선택, 배포 전) |
| B-20: 정산 배치 alert() UX | LOW | Task 15 (선택, 배포 전) |
| buyer-store `Record<string, unknown>` 타입 개선 | LOW | 미처리 |
| CSV 다운로드 페이지네이션 (대용량 대비) | LOW | 미처리 |
| Redis 캐싱 (코드 조회) | LOW | MVP 이후 |

---

## 6. 배포 승인 기준

**Phase 1 MVP 배포 가능 조건 (모두 ✅ 필요):**

- [x] 핵심 플로우 15단계 구현 완료
- [x] T-08: debug 엔드포인트 제거
- [x] T-09: 상품 이미지 업로드 (Vercel Blob)
- [x] B-01: 정산 크론 인증 (CRON_SECRET)
- [x] B-02: 레이스 컨디션 수정 (원자적 UPDATE)
- [x] B-03: 카테고리 UX 피드백
- [x] B-04: 연락처 형식 검증
- [x] B-15: 결제 우회 엔드포인트 제거
- [x] B-16: 관리자 정산 배치 인증 수정
- [x] B-17: 비활성 상품 코드 발급 차단
- [ ] **수동 QA 6개 항목 모두 통과** ← Dev1 Task 12 (진행 중)
- [ ] **B-19/B-20 선택적 수정** ← Dev1 Task 15 (선택)
- [ ] **Vercel 환경변수 7개 확인** ← Dev1 Task 14 (배포 전)
