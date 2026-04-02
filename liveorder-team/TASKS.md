# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-03 (PM — Task 26 완료 반영, Task 27 착수)

---

## 🟢 Dev1 현재 할당 — **Task 27: P3-6 구매자 데이터 삭제권 (GDPR)**

> **완료:** Task 21 (P3-0) ✅ · Task 22 (P3-1) ✅ · Task 23 (P3-2 이메일) ✅ · B-27 ✅ · Task 24 (P3-3 차트) ✅ · Task 25 (P3-4 배송추적) ✅ · Task 26 (P3-5 이메일 인증) ✅
> **지금 할 일:** Task 27 — 구매자 개인정보 삭제권 구현 (PLAN.md P3-6 섹션 참고)

---

## 📋 Phase 3 남은 작업 (순서대로)

### Task 24: P3-3 셀러 대시보드 차트

**우선순위:** LOW
**상태:** ✅ 완료 (2026-04-03)

#### Step 1: 패키지 설치

```bash
npm i recharts
```

#### Step 2: API 수정 — `app/api/seller/dashboard/route.ts`

현재 `Promise.all` 배열에 dailySales raw query 추가:

```typescript
// 기존 Promise.all 6개 항목 뒤에 7번째로 추가
const dailySalesRaw: { date: string; total: bigint }[] = await prisma.$queryRaw`
  SELECT
    TO_CHAR(gs.day AT TIME ZONE 'Asia/Seoul', 'MM/DD') as date,
    COALESCE(SUM(o.amount), 0)::bigint as total
  FROM generate_series(
    NOW() - INTERVAL '6 days', NOW(), INTERVAL '1 day'
  ) gs(day)
  LEFT JOIN orders o
    ON DATE(o.created_at AT TIME ZONE 'Asia/Seoul') = DATE(gs.day AT TIME ZONE 'Asia/Seoul')
    AND o.status != 'REFUNDED'
    AND o.code_id IN (
      SELECT c.id FROM codes c
      JOIN products p ON c.product_id = p.id
      WHERE p.seller_id = ${sellerId}::uuid
    )
  GROUP BY DATE(gs.day), TO_CHAR(gs.day AT TIME ZONE 'Asia/Seoul', 'MM/DD')
  ORDER BY DATE(gs.day) ASC
`;
// BigInt → number 변환 (JSON 직렬화 대응)
const dailySales = dailySalesRaw.map((r) => ({ date: r.date, total: Number(r.total) }));
```

`return NextResponse.json(...)` 응답에 `dailySales` 추가:
```typescript
return NextResponse.json({
  totalProducts,
  activeCodes,
  totalOrders,
  pendingSettlement,
  sellerStatus: seller?.status,
  recentOrders,
  dailySales,  // ← 추가
});
```

#### Step 3: 프론트엔드 수정 — `app/seller/dashboard/page.tsx`

**인터페이스 수정:**
```typescript
// DashboardStats에 추가
interface DashboardStats {
  // ... 기존 필드 유지
  dailySales?: { date: string; total: number }[];
}
```

**import 추가 (파일 상단):**
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
```

**JSX: 최근 주문 카드(`<Card>`) 위에 추가:**
```tsx
{stats.dailySales && stats.dailySales.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">최근 7일 매출</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={stats.dailySales}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`
            }
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(v: number) => [`₩${v.toLocaleString()}`, '매출']}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
)}
```

**커밋:** `feat: 셀러 대시보드 7일 매출 차트 추가 (P3-3)`

---

### Task 25: P3-4 배송 추적

**우선순위:** LOW — Task 24 완료 후
**상태:** ✅ 완료 (2026-04-03)

#### Step 1: `lib/carrier-urls.ts` 신규 생성

```typescript
export const CARRIER_URLS: Record<string, string> = {
  '대한통운': 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  'CJ대한통운': 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  '롯데택배': 'https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=',
  '한진택배': 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=',
  '우체국': 'https://service.epost.go.kr/trace.RetrieveDomRfRcptnInfo.comm?sid1=',
  '로젠택배': 'https://www.ilogen.com/web/personal/trace/',
};

export function getTrackingUrl(carrier: string, trackingNo: string): string | null {
  const base = CARRIER_URLS[carrier];
  return base ? `${base}${trackingNo}` : null;
}
```

#### Step 2: `app/(buyer)/lookup/page.tsx` 수정

파일 상단에 import 추가:
```typescript
import { getTrackingUrl } from '@/lib/carrier-urls';
```

현재 배송 정보 섹션 (line 108-112 근처):
```tsx
// 기존:
{order.trackingNo && (
  <div>
    <p className="font-medium text-blue-800">배송 정보</p>
    <p>택배사: {order.carrier}</p>
    <p>운송장: {order.trackingNo}</p>
  </div>
)}

// 수정 후:
{order.trackingNo && (
  <div>
    <p className="font-medium text-blue-800">배송 정보</p>
    <p>택배사: {order.carrier}</p>
    <p>운송장: {order.trackingNo}</p>
    {order.carrier && (
      (() => {
        const url = getTrackingUrl(order.carrier, order.trackingNo!);
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-blue-600 underline hover:text-blue-800"
          >
            배송 추적 →
          </a>
        ) : null;
      })()
    )}
  </div>
)}
```

**커밋:** `feat: 배송 추적 링크 추가 (P3-4) — 택배사별 URL 매핑`

---

### Task 26: P3-5 셀러 이메일 인증

**우선순위:** LOW — Task 25 완료 후 (P3-2 의존)
**상태:** ✅ 완료 (2026-04-03)

구현 내용:
- `prisma/schema.prisma`: Seller에 `emailVerified`, `emailVerifyToken` 추가
- `prisma/migrations/20260403000002_add_email_verification/migration.sql`: DB 마이그레이션
- `app/api/seller/auth/verify/route.ts`: GET — 토큰 검증 후 이메일 인증 완료
- `app/api/seller/auth/verify/resend/route.ts`: POST — 인증 메일 재발송
- `app/api/sellers/register/route.ts`: 회원가입 시 토큰 생성 + 인증 메일 발송
- `app/seller/auth/verify/page.tsx`: 인증 결과 페이지 (success/invalid/already/error)
- `app/api/seller/dashboard/route.ts`: emailVerified 응답 포함
- `app/seller/dashboard/page.tsx`: 미인증 배너 + 재발송 버튼
- `app/api/seller/me/route.ts`: email 필드 추가

**커밋:** `feat: 셀러 이메일 인증 구현 (P3-5)`

---

### Task 27: P3-6 구매자 데이터 삭제권 (GDPR)

**우선순위:** MED — Task 26 완료 후 ← **현재 진행**
**상태:** 🔄 진행 중

#### Step 1: API 구현 — `app/api/buyer/data-deletion/route.ts` 신규 생성

```typescript
// POST /api/buyer/data-deletion
// Body: { name: string, phone: string }
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json();
  if (!name || !phone) return NextResponse.json({ error: '이름과 전화번호를 입력해 주세요.' }, { status: 400 });

  // 해당 전화번호의 주문에서 개인정보만 마스킹 (정산 무결성 유지)
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

#### Step 2: 요청 페이지 — `app/(buyer)/privacy/request/page.tsx` 신규 생성

- 이름 + 전화번호 입력 폼
- 제출 후 "처리 완료 — N건의 주문 개인정보가 삭제되었습니다" 메시지 표시
- 0건이면 "해당 정보로 등록된 주문이 없습니다"

#### Step 3: 개인정보처리방침 페이지 링크 추가

- `app/(buyer)/privacy/page.tsx` 존재 여부 확인 후 삭제 요청 링크 추가
  - 없으면 간단한 페이지 생성 (링크 포함)

**커밋:** `feat: 구매자 개인정보 삭제 요청 API + 페이지 (P3-6)`

---

## ✅ 완료된 작업

| 완료일 | 작업 | 커밋 |
|--------|------|------|
| 2026-04-03 | Task 26: P3-5 셀러 이메일 인증 — schema 변경, verify API, resend API, verify 페이지, 대시보드 배너 | 17fc5ce |
| 2026-04-03 | Task 25: P3-4 배송 추적 링크 — `lib/carrier-urls.ts` + lookup 페이지 배송 추적 → 링크 | fbadce1 |
| 2026-04-03 | Task 24: P3-3 셀러 대시보드 7일 매출 차트 — recharts 설치, dailySales API, LineChart 컴포넌트 | fbadce1 |
| 2026-04-03 | B-27: chat/page.tsx JSON.parse try/catch 추가 — sessionStorage 손상 시 크래시 방지 | 2e58865 |
| 2026-04-03 | Task 23: P3-2 이메일 알림 — Resend 연동, `lib/email.ts`, 회원가입/승인/주문/정산 4개 알림 | c16cd41 |
| 2026-04-03 | Task 22: P3-1 API 페이지네이션 — `lib/pagination.ts`, `components/ui/Pagination.tsx`, API 4개, 프론트 4개 | 83fdb78 |
| 2026-04-03 | Task 21: P3-0 기술 부채 클린업 — SettlementDrawer 에러 처리, admin 로딩 Skeleton, RefundDialog 상태, buyer-store 타입 | 83fdb78 |
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

---

## 📌 수동 진행 항목 (개발 작업 아님)

### Task 14: Vercel 환경변수 확인 + 배포 ← **진행 중 (수동)**

**상태:** Phase 3 작업과 병행 가능

**작업 내용:**
1. Vercel 프로젝트 Settings → Environment Variables에서 9개 변수 확인:
   - `DATABASE_URL`, `NEXTAUTH_SECRET`, `PORTONE_API_KEY`, `PORTONE_STORE_ID`
   - `PORTONE_API_SECRET` (⚠️ 환불 필수), `BLOB_READ_WRITE_TOKEN`
   - `CRON_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY` (⚠️ 이메일 알림 필수)

2. 미설정 항목 추가 후 Redeploy

3. 프로덕션 스모크 테스트 (PLAN.md 2.2절 참고)
