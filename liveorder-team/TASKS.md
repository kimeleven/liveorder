# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Planner — Task 43 완료 확인 + Task 44 스펙 수립)_

---

## ⚠️ 프로젝트 방향

**v1**: 기존 코드 유지 (그대로 둠)
**v2**: DROP (없음)
**v3**: 카카오톡 챗봇 기반 주문 시스템 — v1 코드 위에 확장

---

## 🚨 v3 핵심 기획 (Sanghun 확정 2026-04-09)

### 비즈니스 모델
- **플랫폼 제공자(우리)** — 오픈빌더 봇 관리, 스킬 서버 운영, 전체 인프라
- **판매자** — 카카오톡 비즈니스 채널 개설 + 상품 등록만
- **고객** — 카카오톡에서 판매자 채널 친구추가 → 챗봇으로 주문

### 아키텍처 (확정 2026-04-09)

**우리 채널 1개 + 봇 1개 + 판매자 선택 구조**

```
[liveorder 채널 1개] → [liveorder 봇 1개] → [스킬 서버]
                                                │
                                                ├→ 봇 ID 검증 (KAKAO_BOT_ID)
                                                ├→ 고객이 코드 입력
                                                ├→ 코드로 상품 DB 조회
                                                ├→ KakaoPaySession 생성
                                                ├→ commerceCard 응답
                                                └→ /kakao/[token] → 결제 진행
```

- 봇 이름: liveorder
- 봇 ID: 69d6729b9fac321ddc6b5d64

### 주문 플로우
1. 고객이 **liveorder 채널** 친구추가
2. 코드 입력 (예: ABC-1234-ABCD)
3. 봇이 상품 카드(commerceCard) + "결제하기" 버튼 전송
4. "결제하기" 클릭 → `/kakao/[token]` 접속
5. 토큰 검증 → 기존 채팅 결제 플로우 (수량 선택 → PortOne → 배송지 입력)
6. 주문 완료

---

## Dev1 현재 작업

### Task 44: 셀러 주문 실시간 현황 개선

**우선순위:** HIGH
**이유:** 셀러가 주문 관리 페이지에서 신규 주문을 수동 새로고침 없이 확인하고, 다른 페이지에서도 미처리 주문 수를 즉시 파악할 수 있어야 함. 주별/월별 매출 분석도 추가.

---

#### 44A: 셀러 주문 목록 30초 자동 갱신

**파일 수정:** `app/seller/orders/page.tsx`

기존 `useEffect` (fetchOrders 최초 호출) 아래에 interval 추가:

```typescript
// 30초마다 자동 갱신
useEffect(() => {
  const timer = setInterval(() => {
    fetchOrders(page)
  }, 30000)
  return () => clearInterval(timer)
}, [page, statusFilter])
```

**주의:** `fetchOrders`가 closure이므로 deps에 `page`, `statusFilter` 포함 필수. 페이지/필터 변경 시 interval 재설정됨.

**완료 조건:**
- [ ] `useEffect` interval 30초 추가
- [ ] 컴포넌트 unmount 시 `clearInterval` 정상 동작

---

#### 44B: 미처리(PAID) 주문 수 배지 API

**파일 신규 생성:** `app/api/seller/orders/unread/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 }, { status: 401 })
  }

  const count = await prisma.order.count({
    where: {
      code: { product: { sellerId: session.user.id } },
      status: 'PAID',
    },
  })

  return NextResponse.json({ count })
}
```

**완료 조건:**
- [ ] `GET /api/seller/orders/unread` → `{ count: number }` 반환
- [ ] 401 시 `{ count: 0 }` 반환 (UI가 배지 숨김 처리)

---

#### 44C: SellerShell 헤더 미처리 주문 배지

**파일 수정:** SellerShell 컴포넌트 또는 셀러 레이아웃

먼저 파일 위치 확인:
```bash
find components -name "*.tsx" | xargs grep -l "seller\|Seller" 2>/dev/null
cat app/seller/layout.tsx
```

**구현 내용 — SellerShell (또는 레이아웃) 최상위에 추가:**
```typescript
const [paidCount, setPaidCount] = useState(0)

useEffect(() => {
  async function fetchUnread() {
    try {
      const res = await fetch('/api/seller/orders/unread')
      if (res.ok) {
        const { count } = await res.json()
        setPaidCount(count)
      }
    } catch { /* 무시 */ }
  }
  fetchUnread()
  const timer = setInterval(fetchUnread, 60000)
  return () => clearInterval(timer)
}, [])
```

**주문 관리 링크에 배지 삽입:**
```tsx
<Link href="/seller/orders" className="flex items-center gap-2">
  주문 관리
  {paidCount > 0 && (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
      {paidCount > 99 ? '99+' : paidCount}
    </span>
  )}
</Link>
```

**완료 조건:**
- [ ] 60초 폴링으로 PAID 주문 수 갱신
- [ ] 0건이면 배지 미표시, 1건 이상이면 빨간 원 배지 표시
- [ ] 99건 초과 시 "99+" 표시

---

#### 44D: 셀러 대시보드 주별/월별 매출 차트

**파일 수정:** `app/api/seller/dashboard/route.ts`

`GET` 핸들러 상단에 period 파라미터 추출 추가:
```typescript
const { searchParams } = new URL(req.url)
const period = searchParams.get('period') ?? 'daily' // 'daily' | 'weekly' | 'monthly'
```

일별/주별/월별 분기 처리 — 기존 일별 로직을 분기로 감싸기:
```typescript
let salesRows: { date: string; orders: bigint; revenue: bigint }[]

if (period === 'weekly') {
  // 최근 8주
  salesRows = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('week', o.created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS date,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(o.amount), 0)::bigint AS revenue
    FROM orders o
    JOIN codes c ON c.id = o.code_id
    JOIN products p ON p.id = c.product_id
    WHERE p.seller_id = ${sellerId}::uuid
      AND o.status NOT IN ('REFUNDED')
      AND o.created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', o.created_at AT TIME ZONE 'Asia/Seoul')
    ORDER BY 1
  `
} else if (period === 'monthly') {
  // 최근 6개월
  salesRows = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('month', o.created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS date,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(o.amount), 0)::bigint AS revenue
    FROM orders o
    JOIN codes c ON c.id = o.code_id
    JOIN products p ON p.id = c.product_id
    WHERE p.seller_id = ${sellerId}::uuid
      AND o.status NOT IN ('REFUNDED')
      AND o.created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', o.created_at AT TIME ZONE 'Asia/Seoul')
    ORDER BY 1
  `
} else {
  // daily (기존 로직 그대로)
  salesRows = await prisma.$queryRaw`...기존 7일 쿼리...`
}
```

응답 키는 기존 `dailySales`로 유지 (하위 호환):
```typescript
return NextResponse.json({ ..., dailySales: salesRows.map(...) })
```

---

**파일 수정:** `app/seller/dashboard/page.tsx`

**state 추가:**
```typescript
const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
```

**fetchDashboard 수정** — period 파라미터 전달:
```typescript
const res = await fetch(`/api/seller/dashboard?period=${chartPeriod}`)
```

**chartPeriod 변경 시 재조회 useEffect 추가:**
```typescript
useEffect(() => {
  fetchDashboard()
}, [chartPeriod])
```

**차트 위 탭 UI 추가:**
```tsx
<div className="flex gap-1 mb-3">
  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
    <Button
      key={p}
      variant={chartPeriod === p ? 'default' : 'outline'}
      size="sm"
      onClick={() => setChartPeriod(p)}
      className="text-xs h-7 px-3"
    >
      {p === 'daily' ? '일별' : p === 'weekly' ? '주별' : '월별'}
    </Button>
  ))}
</div>
```

**X축 레이블 포맷 함수 추가:**
```typescript
function formatChartLabel(dateStr: string, period: string) {
  const d = new Date(dateStr)
  if (period === 'monthly') return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`
  return `${d.getMonth()+1}/${d.getDate()}${period === 'weekly' ? '주' : ''}`
}
```

Recharts `XAxis` `tickFormatter` 수정:
```tsx
<XAxis
  dataKey="date"
  tickFormatter={(v) => formatChartLabel(v, chartPeriod)}
/>
```

**완료 조건:**
- [ ] `app/api/seller/dashboard/route.ts` — period 파라미터 처리 (daily/weekly/monthly 분기)
- [ ] `app/seller/dashboard/page.tsx` — chartPeriod state + 탭 UI + useEffect
- [ ] 주별/월별 차트 데이터가 정상 표시되는지 확인

---

#### 44 완료 조건 (전체)

- [ ] `app/seller/orders/page.tsx` — 30초 interval 자동 갱신 (44A)
- [ ] `app/api/seller/orders/unread/route.ts` — PAID 주문 수 반환 API (44B)
- [ ] SellerShell 또는 레이아웃 파일 — 60초 폴링 + 주문 배지 UI (44C)
- [ ] `app/api/seller/dashboard/route.ts` — period 파라미터 처리 (44D)
- [ ] `app/seller/dashboard/page.tsx` — 차트 기간 탭 (44D)
- [ ] git commit + push

---

## Planner 📋 역할

### 매 실행마다:
1. 기존 v1 코드 분석 → v3 확장 포인트 파악
2. 오픈빌더 봇 시나리오 설계 (대화 흐름, 블록 구조)
3. DB 스키마 설계 (판매자-봇 매핑, 상품, 주문, 배송)
4. API 설계 (스킬 서버 엔드포인트)
5. PLAN.md에 Phase별 기획 작성

---

## Dev1 📋 역할

### 매 실행마다:
1. TASKS.md에서 Dev1 할당 태스크 확인
2. PLAN.md에서 기획 내용 파악
3. 구현 → 테스트 → git add → commit → push
4. TASKS.md 업데이트

### 기술 규칙:
- 기존 v1 코드 구조 유지 — 새 기능은 별도 디렉토리/모듈로 추가
- DB 변경은 Prisma migration으로
- git user: kimeleven / kimeleven@gmail.com

---

## Dev2 📋 역할

### 매 실행마다:
1. TASKS.md에서 Dev2 할당 태스크 확인
2. 프론트엔드/관리자 페이지 구현
3. 판매자 관리자 페이지 (상품 등록, 주문 관리)
4. 구현 → 테스트 → git add → commit → push

---

## QA 📋 역할

### 매 실행마다:
1. 변경 파일만 검토 (git diff)
2. 스킬 서버 API 테스트
3. QA_REPORT.md 업데이트

---

## 로컬 환경
- 프로젝트: ~/eddy-agent/liveorder
- DB: PostgreSQL localhost:5432, liveorder
- GitHub: kimeleven/liveorder
- 기존 스택: Next.js + Prisma + PostgreSQL

---

## 완료된 작업

| Task | 내용 | 완료일 |
|------|------|--------|
| Task 43 | 운송장 일괄 CSV 업로드 (export 주문ID, bulk API, UI 다이얼로그) | 2026-04-09 |
| Task 42 | 셀러 대시보드 채널별 통계 API + UI 카드 | 2026-04-09 |
| Task 41 | 카카오 세션 일회성 삭제, CSV 주문경로 컬럼 추가 | 2026-04-09 |
| Task 40 | `orders.source` 필드 추가 (web/kakao), 카카오 진입 sessionStorage 플래그, 결제 API source 저장, 셀러 주문 목록 카카오 배지 UI | 2026-04-09 |
| Task 39 | `app/api/cron/kakao-session-cleanup/route.ts` cron 생성, `vercel.json` cron 추가, `app/api/kakao/webhook/route.ts` 봇 ID 검증 | 2026-04-09 |
| Task 38 | `docs/kakao-openbuilder-setup.md` 문서 작성, 셀러 코드 페이지 카카오 공지 복사 버튼, 셀러 대시보드 카카오 채널 안내 카드 | 2026-04-09 |
| Task 37 | `/api/kakao/session/[token]` seller 응답에 `id` 누락 버그 수정 → FlowSeller 타입 불일치 해결 | 2026-04-09 |
| Task 36 | 스킬 서버 webhook (commerceCard 응답), 세션 검증 API `/api/kakao/session/[token]`, 카카오 결제 진입 페이지 `/kakao/[token]` | 2026-04-09 |
| Task 35 | KakaoPaySession DB 마이그레이션 (`kakao_pay_sessions` 테이블), `lib/kakao.ts` 기본 구조, Prisma schema 반영 | 2026-04-09 |
| Task 34 | 사업자등록증 이미지 업로드 — `app/api/seller/biz-reg-upload/route.ts`, `app/seller/auth/register/page.tsx` UI, DB 마이그레이션 | 2026-04-09 |
| Task 1~33 | Phase 1+2+3 전체 기능 (v1 웹 플랫폼) | 2026-04-04 |

---

## 규칙
- Sanghun에게 직접 보고 금지 — Eddy가 통합 보고
- QA는 변경분만 검토 (토큰 절약)
- git user: kimeleven
