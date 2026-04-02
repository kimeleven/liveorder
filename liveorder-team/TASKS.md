# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-03 (PM 조율 — Phase 1+2 완전 완료, Task 14 배포 후 Phase 3 시작)

---

## 🟡 Dev1 현재 할당 — **Task 23: P3-2 이메일 알림 (다음)**

> **Task 21, 22 완료 (2026-04-03):** P3-0 클린업 + P3-1 페이지네이션 구현 완료
> **다음:** P3-2 이메일 알림 (Task 23)

### Task 14: Vercel 환경변수 확인 + 배포 ← **수동 작업 (미완료)**

**작업 내용 (수동 작업):**

1. Vercel 프로젝트 Settings → Environment Variables에서 **8개** 변수 설정 확인:
   - `DATABASE_URL` — Neon PostgreSQL 연결 문자열
   - `NEXTAUTH_SECRET` — JWT 서명 키 (32자 이상)
   - `PORTONE_API_KEY` — PortOne V2 API 키
   - `PORTONE_STORE_ID` — PortOne 상점 ID
   - `PORTONE_API_SECRET` — PortOne 환불 API 인증 **(⚠️ 환불 필수)**
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob 토큰
   - `CRON_SECRET` — 정산 크론 Bearer 토큰
   - `NEXTAUTH_URL` — 프로덕션 URL (예: `https://liveorder.vercel.app`)

2. 미설정 항목 추가 후 Redeploy

3. 프로덕션 스모크 테스트:
   - 셀러 회원가입 → 관리자 승인 → 상품 등록 → 코드 발급 + QR 확인
   - 구매자 코드 입력 → PortOne 테스트 결제 → 주문 DB 확인
   - 셀러 운송장 등록 → SHIPPING 전환
   - `POST https://<프로덕션URL>/api/cron/settlements` (Bearer $CRON_SECRET) → Settlement 생성

4. **커밋 없음** — 수동 확인 작업. 완료 후 TASKS.md에 완료 표기.

---

## 📋 다음 작업 — Phase 3 (Task 14 완료 후 순서대로)

### Task 21: P3-0 기술 부채 클린업

**우선순위:** 배포 직후 즉시 — 1일 내 완료

**파일 4개 수정:**

**1. `components/seller/SettlementDetailDrawer.tsx`**
- 현재: `.catch(() => {})` — 에러 무시
- 수정: catch 블록에서 toast 에러 표시

```typescript
// 수정 전
.catch(() => {});

// 수정 후 (toast 라이브러리가 이미 있다면 그것 사용, 없으면 console.error + state)
.catch((err) => {
  console.error('[SettlementDetailDrawer] fetch failed:', err);
  setError('상세 정보를 불러오지 못했습니다. 다시 시도해주세요.');
});
// 그리고 error state가 있으면 Drawer 내부에서 표시:
// {error && <p className="text-sm text-red-500 p-4">{error}</p>}
```

**2. `app/admin/orders/page.tsx`**
- 현재: 로딩 상태 없음
- 수정: isLoading state + Skeleton 표시

```typescript
// 추가할 상태
const [isLoading, setIsLoading] = useState(true);

// fetch 시작 전: setIsLoading(true)
// fetch 완료 후 (finally): setIsLoading(false)

// JSX에서:
{isLoading ? (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
) : (
  // 기존 테이블
)}
```

**3. `components/admin/RefundDialog.tsx`**
- 현재: 성공 후 `onClose()` 직접 호출로 내부 state가 초기화 안 됨
- 수정: `handleClose` 함수 통해 state 초기화 후 닫기

```typescript
// 성공 핸들러에서:
// onClose() 대신:
setSuccess(false); // 또는 다른 내부 state
setReason('');
onClose();
// 또는 handleClose() 함수가 이미 있다면 그것 호출
```

**4. `lib/store/buyer-store.ts` (또는 buyer 관련 store 파일)**
- 현재: `Record<string, unknown>` 사용
- 수정: 명시적 BuyerState 인터페이스 정의

```typescript
interface BuyerState {
  code: string | null;
  product: { id: string; name: string; price: number; imageUrl?: string } | null;
  orderId: string | null;
  // ... 실제 사용하는 필드들
}
```

**커밋:** `fix: 기술 부채 클린업 — SettlementDrawer 에러 처리, 관리자 주문 로딩, RefundDialog 상태, buyer-store 타입`

---

### Task 22: P3-1 API 페이지네이션

**우선순위:** MED — MVP 배포 후 첫 번째 기능 작업

**파일 수정 (4개 API + 1개 UI 컴포넌트 신규):**

**Step 1: 공통 유틸 함수 `lib/pagination.ts`**
```typescript
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
```

**Step 2: API 4개 수정**
- `app/api/seller/orders/route.ts` — GET에 pagination 추가
- `app/api/seller/products/route.ts` — GET에 pagination 추가
- `app/api/seller/codes/route.ts` — GET에 pagination 추가
- `app/api/admin/orders/route.ts` — GET에 pagination 추가

각 API에서 `prisma.$transaction([findMany({skip, take: limit}), count()])` 사용

**Step 3: UI 컴포넌트 신규 `components/ui/Pagination.tsx`**
```typescript
// shadcn Pagination 컴포넌트 기반
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
// Prev / 페이지번호 (최대 5개) / Next 표시
// totalPages가 1이면 렌더링 안 함
```

**Step 4: 목록 페이지 4개에 Pagination 컴포넌트 추가**
- `app/seller/orders/page.tsx`
- `app/seller/products/page.tsx`
- `app/seller/codes/page.tsx`
- `app/admin/orders/page.tsx`

**커밋:** `feat: API 페이지네이션 구현 (P3-1) — 셀러/관리자 목록 4개 + Pagination 컴포넌트`

---

### Task 23: P3-2 이메일 알림

**우선순위:** MED — P3-1 완료 후

**패키지 설치:** `npm i resend`

**환경변수 추가:**
- `RESEND_API_KEY` — `.env.example`에도 추가

**신규 파일 `lib/email.ts`**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // 환경변수 없으면 무시
  try {
    await resend.emails.send({
      from: 'LiveOrder <noreply@liveorder.app>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[email] send failed:', error);
    // 이메일 실패는 비즈니스 로직에 영향 없음
  }
}
```

**API 수정 4곳:**

1. `app/api/sellers/register/route.ts` — 가입 완료 후 관리자에게 알림
2. `app/api/admin/sellers/[id]/route.ts` (또는 승인 API) — 승인 시 셀러에게 알림
3. `app/api/payments/confirm/route.ts` — 주문 생성 성공 후 셀러에게 알림
4. `app/api/cron/settlements/route.ts` — 정산 생성 완료 후 셀러에게 알림

**커밋:** `feat: 이메일 알림 구현 (P3-2) — Resend 연동, 회원가입/승인/주문/정산 4개 알림`

---

### Task 24: P3-3 셀러 대시보드 차트

**우선순위:** LOW — P3-2 완료 후

**패키지 설치:** `npm i recharts`

**파일 수정 2개:**
- `app/api/seller/dashboard/route.ts` — dailySales 데이터 추가 (PLAN.md 3절 SQL 참고)
- `app/seller/dashboard/page.tsx` — LineChart 컴포넌트 추가 (PLAN.md 3절 UI 참고)

**커밋:** `feat: 셀러 대시보드 7일 매출 차트 추가 (P3-3)`

---

## ✅ 완료된 작업

| 완료일 | 작업 | 커밋 |
|--------|------|------|
| 2026-04-03 | Task 22: P3-1 API 페이지네이션 — lib/pagination.ts, 4개 API, Pagination.tsx, 4개 목록 페이지 | TBD |
| 2026-04-03 | Task 21: P3-0 기술 부채 클린업 — SettlementDrawer 에러 처리, 관리자 주문 로딩, RefundDialog 상태, buyer-store 타입 | TBD |
| 2026-04-03 | Task 12: QA 6개 항목 코드 레벨 검증 완료 — 결제/운송장/승인/크론/미들웨어/이미지 업로드 | 1a4164d |
| 2026-04-03 | B-23: QR 코드 구현 — qrcode 패키지, 발급 성공 화면 QR 표시 + `/order/[code]` 라우트 | 882fe02 |
| 2026-04-03 | B-24: PLAN.md에 `PORTONE_API_SECRET` 환경변수 추가 | 882fe02 |
| 2026-04-03 | B-25: 정산 테이블 `colSpan={8}` 수정 | 882fe02 |
| 2026-04-03 | B-26: `/api/seller/products` GET에 `isActive: true` 필터 추가 | 882fe02 |
| 2026-04-03 | Task 20: UX-3 확인 — shadcn SelectItem 자동 처리, 수정 불필요 | - |
| 2026-04-03 | Task 19: 정산 상세 드릴다운 (P2-3, B-06) — SettlementDetailDrawer + `/api/seller/settlements/[id]` | 80478e4 |
| 2026-04-03 | UX-1: 상품 등록 시 코드 자동 발급 — autoCode 응답 + 코드 표시 UI | 80478e4 |
| 2026-04-03 | UX-2: 코드 발급 시 QR코드 자동 생성 — QR 스캔으로 코드 입력 자동화 | c0bb241 |
| 2026-04-03 | Task 16: 관리자 주문 목록 + 환불 UI (P2-1) | 048ac72 |
| 2026-04-03 | Task 17: 셀러 대시보드 최근 주문 실데이터 표시 (B-22) | 49a984b |
| 2026-04-03 | Task 18: JWT 세션 갱신 UX 개선 — "승인 확인" 버튼 (B-18) | 49a984b |
| 2026-04-03 | Task 15: B-19 서버측 전화번호 검증 + B-20 정산 배치 alert() 제거 | 6bcb637 |
| 2026-04-02 | B-15 결제 우회 엔드포인트 삭제, B-16 관리자 배치 인증 수정, B-17 비활성 상품 코드 발급 차단 | ac653d0 |
| 2026-04-02 | 미들웨어 HKDF salt 버그 수정 | 876bb02 |
| 2026-04-02 | 관리자 계정 DB seed 수정 | cc08f64 |
| 2026-04-02 | B-05 N+1 쿼리 최적화, B-08 재시도 버튼, B-09 새 코드 입력 버튼, .env.example | d77750f |
| 2026-04-02 | B-03 카테고리 미선택 UX, B-04 연락처 형식 검증 (프론트) | b5c9043 |
| 2026-04-02 | B-01 크론 인증, B-02 레이스컨디션 수정 | 1485f74 |
| 2026-04-02 | debug 엔드포인트 제거, 상품 이미지 업로드 (Vercel Blob) | af0cc28 |
| 2026-04-02 | DELIVERED 상태, 상품 수정/삭제, 정산 필터 | cad9243 |
| 2026-04-02 | 운송장 UI, 코드 API 보안, PENDING 차단, 개인정보 동의 | afc5b54 |
| 2026-04-01 | 미들웨어 JWE 복호화, auth() 레이아웃 루프 수정 | 2c30a67 |
| 2026-04-01 | Neon HTTP 어댑터, Prisma 빌드 스크립트 | 3732637 |
| 초기 | 셀러/관리자 인증, 상품/코드/주문/정산 전체 플로우 | - |
