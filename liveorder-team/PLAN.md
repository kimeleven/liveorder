# LIVEORDER 개발 계획서

> 최종 업데이트: 2026-04-03 (PM 조율 — Task 28~29 완료, B-33 완료, Task 30 착수)
> 현재 단계: **Phase 3 마무리 — Task 30 (LOW 버그 번들) 진행 중**
> P3-0~P3-8 완료. B-28~B-33 전체 수정 완료. HIGH QA 버그 모두 해결. Task 30: seller/orders isLoading + seller/dashboard 에러 처리 + PLAN.md env vars 업데이트. Task 14 (Vercel 배포) 병행.

---

## 1. Phase 1 + 2 완료 현황 ✅

모든 코드 구현 및 QA 완료. Task 14 (Vercel 수동 배포 확인)만 남음.

### 구현 완료 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로젝트 인프라 (Next.js 16 + Prisma + Neon + Vercel) | ✅ | |
| DB 스키마 (Admin, Seller, Product, Code, Order, Settlement, AuditLog) | ✅ | settlementId FK 포함 |
| 셀러 회원가입 / 로그인 | ✅ | |
| 관리자 로그인 | ✅ | |
| 미들웨어 인증 (HKDF JWE 복호화) | ✅ | salt 버그 수정 완료 |
| 상품 등록/수정/삭제/목록 + 코드 자동 발급 (UX-1) | ✅ | soft delete, autoCode 포함 |
| 상품 이미지 업로드 (Vercel Blob) | ✅ | 5MB 제한 |
| 코드 발급/관리 + API 보안 + QR 생성 (UX-2) | ✅ | qrcode 라이브러리, QR 다운로드 |
| QR 스캔 → `/order/[code]` 자동 코드 입력 | ✅ | |
| 셀러 PENDING 차단, 비활성 상품 코드 발급 차단 | ✅ | |
| 구매자 코드 입력 → 채팅 플로우 | ✅ | |
| PortOne 결제 연동 + 서버 검증 + 레이스 컨디션 방지 | ✅ | 원자적 UPDATE |
| 주문 조회 (비회원, 전화번호+주문번호) | ✅ | |
| 배송지 입력 + 개인정보 동의 체크박스 | ✅ | |
| 셀러 주문 관리 + CSV 다운로드 | ✅ | UTF-8 BOM |
| 운송장 등록 UI (Dialog) + DELIVERED 상태 | ✅ | PAID→SHIPPING→DELIVERED |
| 셀러 대시보드 (통계 카드 + 최근 주문 실데이터) | ✅ | |
| 셀러 대시보드 승인 확인 버튼 (B-18) | ✅ | 승인 시 자동 로그아웃 + 재로그인 안내 |
| 셀러 정산 페이지 (목록 + 필터 + 합계 + 상세 드릴다운) | ✅ | SettlementDetailDrawer |
| 관리자 셀러 승인/거부/정지 + 감사 로그 | ✅ | |
| 관리자 정산 조회 + 배치 버튼 (CRON_SECRET 인증) | ✅ | |
| 관리자 주문 목록 + 환불 UI | ✅ | RefundDialog + `/api/admin/orders` |
| 정산 크론 (D+3, settlementId FK 연결) | ✅ | |
| 보안: debug 엔드포인트 제거, 결제 우회 엔드포인트 제거, 서버측 전화번호 검증 | ✅ | |

### 배포 전 잔여 항목

| 항목 | 상태 |
|------|------|
| Vercel 환경변수 8개 확인 + 배포 | 🔄 **진행 중** (Task 14 — 수동) |

---

## 2. 배포 체크리스트 (Task 14)

### 2.1 환경변수 (서버사이드 9개 + 클라이언트사이드 2개)

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 | ✅ |
| `NEXTAUTH_SECRET` | JWT 서명 키 (32자 이상) | ✅ |
| `PORTONE_API_KEY` | PortOne V2 API 키 | ✅ |
| `PORTONE_STORE_ID` | PortOne 상점 ID | ✅ |
| `PORTONE_API_SECRET` | PortOne 환불 API 인증 시크릿 (환불에 필수) | ✅ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 토큰 | ✅ |
| `CRON_SECRET` | 정산 크론 Bearer 토큰 | ✅ |
| `NEXTAUTH_URL` | 프로덕션 URL (예: `https://liveorder.vercel.app`) | ✅ |
| `RESEND_API_KEY` | 이메일 알림 (P3-2 필수) | ✅ |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | PortOne 결제창 클라이언트 호출 ⚠️ NEXT_PUBLIC 필수 | ✅ |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | PortOne 채널 키 클라이언트 호출 ⚠️ NEXT_PUBLIC 필수 | ✅ |
| `ADMIN_EMAIL` | 관리자 알림 수신 이메일 (미설정 시 admin@liveorder.app 폴백) | 선택 |

### 2.2 배포 후 스모크 테스트

1. 셀러 회원가입 → 관리자 승인 → 상품 등록 → 코드 발급 → QR 확인
2. 구매자 코드 입력 → PortOne 테스트 결제 → 주문 생성 확인
3. 셀러 주문 확인 → 운송장 등록 → SHIPPING 전환
4. `POST /api/cron/settlements` (Bearer CRON_SECRET) → Settlement 생성

---

## 3. Phase 3 로드맵 (MVP 배포 이후)

Task 14 완료 즉시 시작. 우선순위 순서로 정렬.

### P3-0: 기술 부채 클린업 (배포 직후 선행)

낮은 위험도의 품질 개선. 1일 내 완료 목표.

**대상 파일 및 수정 내용:**

```
1. components/seller/SettlementDetailDrawer.tsx
   - fetch 실패 시 사용자 피드백 없음 (.catch(() => {}))
   - 수정: catch 블록에 toast 에러 표시

2. app/admin/orders/page.tsx
   - 로딩 상태 없음 — 데이터 페치 중 UI 공백
   - 수정: isLoading state + Skeleton 컴포넌트 표시

3. components/admin/RefundDialog.tsx
   - 성공 후 handleClose 대신 onClose 직접 호출 (상태 초기화 우회)
   - 수정: 성공 후 내부 state 초기화 → onClose 호출

4. lib/store/buyer-store.ts (또는 해당 파일)
   - Record<string, unknown> 타입 사용으로 타입 안전성 부재
   - 수정: 명시적 BuyerState 인터페이스 정의
```

**커밋:** `fix: 기술 부채 클린업 — SettlementDrawer 에러 처리, 관리자 주문 로딩, RefundDialog 상태, buyer-store 타입`

---

### P3-1: API 페이지네이션 (B-21)

**대상 API (4개):**
- `GET /api/seller/orders`
- `GET /api/seller/products`
- `GET /api/seller/codes`
- `GET /api/admin/orders`

**공통 응답 스펙:**
```typescript
// 요청: GET /api/seller/orders?page=1&limit=20
// 응답:
{
  data: Order[],
  pagination: {
    page: number,       // 현재 페이지 (1-based)
    limit: number,      // 페이지 당 항목 수
    total: number,      // 전체 항목 수
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}
```

**API 수정 패턴 (각 route.ts 동일):**
```typescript
// app/api/seller/orders/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({ where: { ... }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.order.count({ where: { ... } })
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  });
}
```

**프론트엔드:**
- `components/ui/Pagination.tsx` 신규 생성 (shadcn Pagination 컴포넌트 활용)
- Props: `{ page, totalPages, onPageChange }`
- 각 목록 페이지 하단에 추가: `app/seller/orders/page.tsx`, `app/seller/products/page.tsx`, `app/seller/codes/page.tsx`, `app/admin/orders/page.tsx`

---

### P3-2: 이메일 알림 (B-11)

**라이브러리:** Resend (npm i resend) — Next.js App Router 친화적

**환경변수 추가:** `RESEND_API_KEY`

**신규 파일:** `lib/email.ts`
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({
      from: 'LiveOrder <noreply@liveorder.app>',
      to,
      subject,
      html,
    });
  } catch (error) {
    // 이메일 실패는 비즈니스 로직에 영향 없음 — 로그만 기록
    console.error('[email] send failed:', error);
  }
}
```

**발송 시점 4곳:**
1. `app/api/sellers/register/route.ts` — 회원가입 완료 후 관리자에게 "신규 셀러 승인 요청"
2. `app/api/admin/sellers/[id]/route.ts` — 셀러 승인 시 셀러에게 "승인 완료"
3. `app/api/payments/confirm/route.ts` — 주문 생성 후 셀러에게 "새 주문 접수"
4. `app/api/cron/settlements/route.ts` — 정산 생성 후 셀러에게 "정산 완료"

**주의:** 모든 sendEmail 호출은 `await`하되, 실패해도 기존 응답에 영향 없어야 함 (이미 try/catch 내부에서 처리)

---

### P3-3: 셀러 대시보드 차트 (B-13) — ✅ 완료 (Task 24, fbadce1)

**현황:** recharts 미설치. API에 dailySales 없음. 프론트엔드에 차트 없음.

**파일 수정:** `app/seller/dashboard/page.tsx`, `app/api/seller/dashboard/route.ts`

**라이브러리:** `recharts` (npm i recharts)

**API 수정 — `/api/seller/dashboard/route.ts`에 추가:**
```typescript
// 최근 7일 일별 매출 (raw query)
const dailySales: { date: string; total: number }[] = await prisma.$queryRaw`
  SELECT
    TO_CHAR(o.created_at AT TIME ZONE 'Asia/Seoul', 'MM/DD') as date,
    COALESCE(SUM(o.amount), 0)::int as total
  FROM generate_series(
    NOW() - INTERVAL '6 days', NOW(), INTERVAL '1 day'
  ) gs(day)
  LEFT JOIN orders o ON DATE(o.created_at AT TIME ZONE 'Asia/Seoul') = DATE(gs.day AT TIME ZONE 'Asia/Seoul')
    AND o.status != 'REFUNDED'
    AND o.code_id IN (
      SELECT c.id FROM codes c
      JOIN products p ON c.product_id = p.id
      WHERE p.seller_id = ${sellerId}::uuid
    )
  GROUP BY TO_CHAR(o.created_at AT TIME ZONE 'Asia/Seoul', 'MM/DD'), DATE(gs.day)
  ORDER BY DATE(gs.day) ASC
`;
```

**UI 컴포넌트 — `app/seller/dashboard/page.tsx`에 추가:**
```tsx
// 기존 통계 카드 아래에 추가
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// 7일 매출 라인 차트
<Card className="col-span-2">
  <CardHeader><CardTitle>최근 7일 매출</CardTitle></CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={dailySales}>
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(v) => `₩${(v/10000).toFixed(0)}만`} />
        <Tooltip formatter={(v: number) => [`₩${v.toLocaleString()}`, '매출']} />
        <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

---

### P3-4: 배송 추적 (B-12) — ✅ 완료 (Task 25, fbadce1)

**현황:** `app/(buyer)/lookup/page.tsx`에 carrier + trackingNo 표시 코드 있음 (line 108-112). 하지만 추적 링크 없음. `lib/carrier-urls.ts` 미존재.

**최소 구현 (외부 API 없이):**
- `app/(buyer)/lookup/page.tsx`의 배송정보 섹션에 "배송 추적" 버튼 추가
- 운송장이 있는 경우: 해당 택배사 추적 페이지로 새 탭 열기

**택배사 URL 매핑 (`lib/carrier-urls.ts`):**
```typescript
export const CARRIER_URLS: Record<string, string> = {
  '대한통운': 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  '롯데택배': 'https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=',
  '한진택배': 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=',
  '우체국': 'https://service.epost.go.kr/trace.RetrieveDomRfRcptnInfo.comm?sid1=',
};

export function getTrackingUrl(carrier: string, trackingNo: string): string | null {
  const base = CARRIER_URLS[carrier];
  return base ? `${base}${trackingNo}` : null;
}
```

**Note:** 스윗트래커 API 연동은 트래픽 확인 후 결정

---

### P3-5: 셀러 이메일 인증 (기획서 명시)

**DB 변경 필요:**
```prisma
// prisma/schema.prisma Seller 모델에 추가
emailVerified  Boolean  @default(false) @map("email_verified")
emailVerifyToken String? @map("email_verify_token") @db.VarChar(100)
```

**마이그레이션:** `npx prisma migrate dev --name add-email-verification`

**플로우:**
1. 회원가입 → emailVerified=false, emailVerifyToken=nanoid(32) 생성
2. `sendEmail(email, "이메일 인증", ...)` — 인증 링크: `/seller/auth/verify?token=...`
3. `app/api/seller/auth/verify/route.ts` — token 조회 → emailVerified=true, token 삭제
4. `app/seller/auth/verify/page.tsx` — 인증 완료/실패 화면
5. 미인증 셀러가 로그인하면 → "이메일 인증이 필요합니다" 화면 (재발송 버튼 포함)

---

### P3-6: 구매자 데이터 삭제권 (개인정보법) — ✅ 완료 (Task 27, 3b39223)

**최소 구현 (비회원 구매자):**

**신규 파일 2개 + 기존 파일 수정 1개:**

#### 1. `app/api/buyer/data-deletion/route.ts` (신규)
```typescript
// POST /api/buyer/data-deletion
// Body: { name: string, phone: string }
// 처리: 해당 전화번호+이름 주문에서 개인정보 마스킹 (정산 무결성 유지)
// 응답: { deleted: number }
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json();
  if (!name || !phone)
    return NextResponse.json({ error: '이름과 전화번호를 입력해 주세요.' }, { status: 400 });

  const result = await prisma.order.updateMany({
    where: { buyerPhone: phone, buyerName: name },
    data: {
      buyerName: '[삭제됨]',
      buyerPhone: '[삭제됨]',
      address: '[삭제됨]',
      addressDetail: '[삭제됨]',
      memo: '[삭제됨]',
    },
  });

  return NextResponse.json({ deleted: result.count });
}
```

#### 2. `app/(buyer)/privacy/request/page.tsx` (신규)
- `'use client'` 클라이언트 컴포넌트
- 이름 + 전화번호 입력 폼 (이름: text, 전화번호: tel)
- 전화번호 형식: 하이픈 없이 숫자만 (010xxxxxxxx)
- 제출 → `POST /api/buyer/data-deletion` 호출
- 결과 표시:
  - `deleted > 0`: "처리 완료 — {N}건의 주문 개인정보가 삭제되었습니다."
  - `deleted === 0`: "해당 정보로 등록된 주문이 없습니다. 이름과 전화번호를 다시 확인해 주세요."
- 상단 링크: "← 개인정보처리방침으로 돌아가기" (`/terms/privacy`)

**레이아웃:**
```tsx
<div className="max-w-md mx-auto p-6">
  <h1 className="text-xl font-bold mb-4">개인정보 삭제 요청</h1>
  <p className="text-sm text-muted-foreground mb-6">
    주문 시 입력하신 이름과 전화번호를 입력하시면 해당 주문의 개인정보(이름, 전화번호, 배송주소)를 삭제합니다.
    단, 거래 기록(주문번호, 결제금액)은 전자상거래법에 따라 5년간 보존됩니다.
  </p>
  <form> ... </form>
  {result && <p className="mt-4 text-sm ...">...</p>}
</div>
```

#### 3. `app/(buyer)/terms/privacy/page.tsx` (기존 수정)
파일 끝 `<h2>4. 문의</h2>` 섹션 뒤에 추가:
```tsx
<h2>5. 개인정보 삭제 요청</h2>
<p>
  전자상거래법상 보존 의무 기간이 경과한 정보 또는 마케팅 목적으로 수집된 정보에 대해
  삭제를 요청하실 수 있습니다.
</p>
<p>
  <Link href="/privacy/request" className="text-blue-600 underline">
    개인정보 삭제 요청 →
  </Link>
</p>
```

**커밋:** `feat: 구매자 개인정보 삭제 요청 API + 페이지 (P3-6)`

---

### P3-7: 기술 부채 최종 클린업 (Task 28 — 진행 중)

**코드 검증 결과 (2026-04-03):**
- `app/api/admin/orders/route.ts:35` — `take: 50` 하드코딩 확인 → 미수정
- `app/seller/orders/page.tsx:88` — `.catch(() => {})` 확인 → 미수정

**대상 버그 2개:**

#### B-28: `app/api/admin/orders/route.ts` 페이지네이션 불일치

현재 상태: `take: 50` 하드코딩, 응답 `{ orders, total }` (셀러 API 표준 `{ data, pagination }` 불일치)
프론트엔드(`app/admin/orders/page.tsx`)가 `{ orders, total }` 형식에 맞게 구현되어 있어 동작은 정상.

**수정 방향:**
- `lib/pagination.ts`의 `parsePagination()` + `buildPaginationResponse()` 적용
- 응답을 `{ data, pagination }` 형식으로 통일
- `app/admin/orders/page.tsx` 프론트엔드도 `res.data`, `res.pagination.total` 등으로 수정
- `components/ui/Pagination.tsx` 컴포넌트 연결

#### B-29: `app/seller/orders/page.tsx:88` fetch 에러 무시

현재 상태: `fetchOrders()` fetch 실패 시 `.catch(() => {})` 로 에러 무시 — 빈 목록만 표시
**수정 방향:**
```typescript
// 현재:
.catch(() => {})

// 수정 후:
.catch((err) => {
  console.error('[seller/orders] fetch failed:', err);
  setError('주문 목록을 불러오지 못했습니다. 새로고침해 주세요.');
});
// JSX에 에러 메시지 표시 추가
```

**커밋:** `fix: admin/orders 페이지네이션 표준화 + seller/orders 에러 처리 (B-28, B-29)`

---

### P3-8: 이메일 인증 토큰 만료 (Task 29 — B-32)

**현황:** `app/api/seller/auth/verify/route.ts`에 토큰 만료 검증 로직 없음. 이메일 본문에는 "24시간 이내 사용" 안내하지만 실제로는 무기한 유효.

**DB 변경 (마이그레이션 필요):**
```prisma
// prisma/schema.prisma — Seller 모델에 추가
emailVerifyTokenExpiresAt DateTime? @map("email_verify_token_expires_at") @db.Timestamptz
```

**마이그레이션:** `npx prisma migrate dev --name add_email_verify_token_expiry`

**파일 수정 3곳:**

#### 1. `app/api/sellers/register/route.ts` 수정 — 토큰 생성 시 만료 시간 함께 저장
```typescript
// emailVerifyToken 생성 코드 근처에 추가:
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후
await prisma.seller.update({
  where: { id: newSeller.id },
  data: {
    emailVerifyToken: token,
    emailVerifyTokenExpiresAt: expiresAt,
  },
});
```

#### 2. `app/api/seller/auth/verify/resend/route.ts` 수정 — 재발송 시도 만료 시간 갱신
```typescript
// 토큰 업데이트 시:
data: {
  emailVerifyToken: newToken,
  emailVerifyTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
},
```

#### 3. `app/api/seller/auth/verify/route.ts` 수정 — 만료 검증 추가
```typescript
// token 조회 후 만료 검증:
const seller = await prisma.seller.findFirst({
  where: { emailVerifyToken: token },
});
if (!seller) return redirect(`${baseUrl}?result=invalid`);

// 만료 확인
if (seller.emailVerifyTokenExpiresAt && seller.emailVerifyTokenExpiresAt < new Date()) {
  return redirect(`${baseUrl}?result=expired`);
}

// 정상 처리: emailVerified=true, token/expiresAt 초기화
await prisma.seller.update({
  where: { id: seller.id },
  data: {
    emailVerified: true,
    emailVerifyToken: null,
    emailVerifyTokenExpiresAt: null,
  },
});
return redirect(`${baseUrl}?result=success`);
```

#### 4. `app/seller/auth/verify/page.tsx` 수정 — expired 케이스 추가
```tsx
// result === 'expired' 케이스:
{result === 'expired' && (
  <div className="text-yellow-600">
    <p>인증 링크가 만료되었습니다. (24시간 초과)</p>
    <p className="text-sm mt-2">셀러 대시보드에서 인증 메일을 재발송해 주세요.</p>
  </div>
)}
```

**커밋:** `fix: 이메일 인증 토큰 만료 검증 추가 (B-32)`

---

## 4. 기술 부채 잔여 목록

| 항목 | 우선순위 | 계획 |
|------|----------|------|
| SettlementDetailDrawer 에러 토스트 없음 | LOW | ✅ P3-0 완료 (Task 21) |
| admin/orders/page.tsx 로딩 상태 없음 | LOW | ✅ P3-0 완료 (Task 21) |
| RefundDialog 성공 후 상태 초기화 우회 | LOW | ✅ P3-0 완료 (Task 21) |
| buyer-store 타입 안전성 | LOW | ✅ P3-0 완료 (Task 21) |
| API 전체 페이지네이션 없음 (B-21) | MED | ✅ P3-1 완료 (Task 22) |
| 이메일 알림 없음 (B-11) | MED | ✅ P3-2 완료 (Task 23) |
| 셀러 대시보드 차트 없음 (B-13) | LOW | ✅ P3-3 완료 (Task 24, fbadce1) |
| 배송 추적 API 없음 (B-12) | LOW | ✅ P3-4 완료 (Task 25, fbadce1) |
| 셀러 이메일 인증 없음 | LOW | ✅ P3-5 완료 (Task 26, 17fc5ce) |
| 구매자 데이터 삭제권 없음 (GDPR) | MED | ✅ P3-6 완료 (Task 27, 3b39223) |
| admin/orders API 페이지네이션 표준 불일치 (B-28) | LOW | ✅ Task 28 완료 (1ddddfc) |
| seller/orders fetch 에러 무시 (B-29) | LOW | ✅ Task 28 완료 (1ddddfc) |
| 이메일 인증 토큰 만료 검증 없음 (B-32) | LOW | ✅ Task 29 완료 (1ee50ab) |
| terms/privacy 삭제 요청 링크 없음 (B-33) | MED | ✅ 완료 (9b7adfe) |
| seller/orders isLoading Skeleton 없음 | LOW | 🟢 Task 30 진행 중 |
| seller/dashboard fetch 에러 무시 | LOW | 🟢 Task 30 진행 중 |
| CSV 주문 내보내기 대용량 처리 (B-14) | LOW | 스트리밍 검토 |
| Redis 캐싱 (B-10) | LOW | 트래픽 확인 후 |

---

## 5. 브랜치 전략

- `master` — 메인 브랜치 (Vercel 연동, 모든 커밋 직접 푸시)
- DB 스키마 변경: `npx prisma migrate dev --name <설명>` → 커밋에 포함
- 환경변수 추가 시 `.env.example` 동시 업데이트
