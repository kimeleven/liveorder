# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 43 완료 확인, Task 44 스펙 수립)_

---

## 프로젝트 개요

기존 v1 웹 기반 주문 플랫폼 위에 **카카오톡 챗봇 주문 플로우** 추가.
- v1: Next.js 기반 웹 플랫폼 (Phase 1+2+3 완료)
- v3: 카카오 오픈빌더 스킬 서버 + 결제 연결 페이지

---

## 현재 상태 (2026-04-09)

### Phase 4 완료된 작업
| Task | 내용 | 상태 |
|------|------|------|
| Task 34 | 사업자등록증 이미지 업로드 (Vercel Blob) | ✅ 완료 |
| Task 35 | KakaoPaySession DB 마이그레이션 + `lib/kakao.ts` | ✅ 완료 |
| Task 36 | 스킬 서버 webhook (commerceCard), 세션 API, 카카오 결제 진입 페이지 | ✅ 완료 |
| Task 37 | `/api/kakao/session/[token]` seller.id 누락 버그 수정 | ✅ 완료 |
| Task 38 | OpenBuilder 설정 문서 + 셀러 코드 페이지 카카오 공지 복사 버튼 + 셀러 대시보드 안내 카드 | ✅ 완료 |
| Task 39 | 카카오 세션 자동 정리 cron + 웹훅 봇 ID 검증 | ✅ 완료 |
| Task 40 | 주문 소스 추적 (`source: 'web' \| 'kakao'`) — DB 스키마, 결제 API, 셀러 주문 목록 카카오 배지 UI | ✅ 완료 |
| Task 41 | 카카오 세션 일회성 보장 (즉시 삭제) + CSV 주문경로 컬럼 추가 | ✅ 완료 |
| Task 42 | 셀러 대시보드 채널별 통계 (카카오 vs 웹, 최근 30일) | ✅ 완료 |
| Task 43 | 운송장 일괄 CSV 업로드 (export 주문ID, bulk API, UI 다이얼로그) | ✅ 완료 |

### 현재 진행
- **Task 44**: 셀러 주문 실시간 현황 개선 (30초 폴링 + 미처리 주문 배지 + 주별/월별 매출 차트)

---

## 시스템 아키텍처 (확정)

```
[카카오 오픈빌더] → POST /api/kakao/webhook
                          │
                          ├→ 봇 ID 검증 (KAKAO_BOT_ID 환경변수)
                          ├→ 코드 패턴 추출 + DB 유효성 검증
                          ├→ KakaoPaySession 생성 (32자 토큰, 30분 만료)
                          └→ commerceCard 응답 (결제하기 → /kakao/[token])

[구매자] 결제하기 클릭 → /kakao/[token]
                          │
                          ├→ GET /api/kakao/session/[token] 검증 + 즉시 삭제
                          ├→ sessionStorage pendingCode 저장
                          ├→ sessionStorage kakaoSource='true' 저장
                          └→ /chat redirect → 기존 결제 플로우

[PaymentSummary] → POST /api/payments/confirm
                          │
                          ├→ sessionStorage에서 kakaoSource 읽기
                          ├→ body에 source: 'kakao' | 'web' 포함
                          └→ 결제 완료 후 셀러 이메일 알림

[Vercel Cron 매일 03:00] → DELETE expired kakao_pay_sessions
[셀러 CSV 다운로드] → 주문ID + 주문경로 컬럼 포함 (웹/카카오) ← Task 43 완료
[셀러 운송장 일괄 업로드] → POST /api/seller/orders/tracking/bulk ← Task 43 완료
[셀러 대시보드] → 채널별 주문 비율 통계 (최근 30일) ← Task 42 완료

[셀러 주문 목록] → 30초 자동 갱신 ← Task 44 예정
[SellerShell 헤더] → 미처리(PAID) 주문 수 배지 ← Task 44 예정
[셀러 대시보드 차트] → 주별/월별 탭 추가 ← Task 44 예정
```

---

## Phase 4: Task 44 상세 스펙

### 배경 / 목적

셀러가 주문 관리 페이지를 열어두고 운영할 때:
1. **신규 주문이 들어왔는지 수동 새로고침이 필요** — 자동 폴링 없음
2. **다른 페이지(대시보드, 상품 등)에서 미처리 주문 수 파악 불가** — 헤더 배지 없음
3. **일별 차트만 있고 주별/월별 성과 확인 불가** — 탭 없음

---

### Task 44A: 셀러 주문 목록 30초 자동 갱신

**파일 수정:** `app/seller/orders/page.tsx`

현재 `fetchOrders`는 수동 실행만 됨. `useEffect`에 interval 추가.

**추가할 코드 (기존 useEffect 아래에 추가):**
```typescript
// 30초마다 자동 갱신
useEffect(() => {
  const timer = setInterval(() => {
    fetchOrders(page)
  }, 30000)
  return () => clearInterval(timer)
}, [page, statusFilter])
```

**주의:** `fetchOrders`가 `page`와 `statusFilter` state에 의존하므로 deps에 포함. 페이지나 필터가 바뀌면 interval 재설정.

**완료 조건:**
- [ ] `useEffect` interval 30초 추가
- [ ] 컴포넌트 unmount 시 `clearInterval` 정상 동작 확인

---

### Task 44B: 미처리(PAID) 주문 수 배지 API

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

---

### Task 44C: SellerShell 헤더에 미처리 주문 배지

**파일 수정:** `components/seller/SellerShell.tsx` (또는 셀러 레이아웃 파일)

먼저 파일 위치 확인 후 구현:
```bash
find /Users/a1111/eddy-agent/liveorder/components -name "*.tsx" | xargs grep -l "SellerShell\|seller.*layout" 2>/dev/null
```

**구현 내용:**
- 최상단에서 `GET /api/seller/orders/unread` 60초마다 폴링
- "주문 관리" 메뉴 링크 옆에 PAID 건수 배지 표시
- 0건이면 배지 미표시, 1건 이상이면 붉은 원 배지로 표시

**예시 UI:**
```tsx
// 주문 관리 링크에 배지 추가
<Link href="/seller/orders" className="flex items-center gap-2">
  주문 관리
  {paidCount > 0 && (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
      {paidCount > 99 ? '99+' : paidCount}
    </span>
  )}
</Link>
```

**폴링 로직 (SellerShell 내부):**
```typescript
const [paidCount, setPaidCount] = useState(0)

useEffect(() => {
  async function fetchUnread() {
    try {
      const res = await fetch('/api/seller/orders/unread')
      if (res.ok) {
        const data = await res.json()
        setPaidCount(data.count)
      }
    } catch { /* 무시 */ }
  }
  fetchUnread()
  const timer = setInterval(fetchUnread, 60000)
  return () => clearInterval(timer)
}, [])
```

---

### Task 44D: 셀러 대시보드 주별/월별 매출 차트 탭

**파일 수정:** `app/api/seller/dashboard/route.ts`

현재 API는 `period` 파라미터 없이 최근 7일 일별 데이터만 반환.

**파라미터 추가:**
```typescript
const url = new URL(req.url)
const period = url.searchParams.get('period') ?? 'daily' // 'daily' | 'weekly' | 'monthly'
```

**각 period별 SQL 로직:**

`daily` (기존, 최근 7일):
```sql
SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') as date,
       COUNT(*) as orders, SUM(amount) as revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND code_id IN (셀러 코드 목록)
  AND status NOT IN ('REFUNDED')
GROUP BY 1 ORDER BY 1
```

`weekly` (최근 8주):
```sql
SELECT DATE_TRUNC('week', created_at AT TIME ZONE 'Asia/Seoul') as week_start,
       COUNT(*) as orders, SUM(amount) as revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '8 weeks'
  AND code_id IN (셀러 코드 목록)
  AND status NOT IN ('REFUNDED')
GROUP BY 1 ORDER BY 1
```

`monthly` (최근 6개월):
```sql
SELECT DATE_TRUNC('month', created_at AT TIME ZONE 'Asia/Seoul') as month_start,
       COUNT(*) as orders, SUM(amount) as revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '6 months'
  AND code_id IN (셀러 코드 목록)
  AND status NOT IN ('REFUNDED')
GROUP BY 1 ORDER BY 1
```

**기존 API 응답 구조 유지** — `dailySales` 키는 period 무관하게 동일 키 사용 (하위 호환).

---

**파일 수정:** `app/seller/dashboard/page.tsx`

현재 차트 위에 기간 탭 추가:

```tsx
// 탭 state
const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

// fetchDashboard에서 period 파라미터 전달
const res = await fetch(`/api/seller/dashboard?period=${chartPeriod}`)

// 차트 위 탭 UI
<div className="flex gap-1 mb-4">
  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
    <Button
      key={p}
      variant={chartPeriod === p ? 'default' : 'outline'}
      size="sm"
      onClick={() => setChartPeriod(p)}
    >
      {p === 'daily' ? '일별' : p === 'weekly' ? '주별' : '월별'}
    </Button>
  ))}
</div>
```

**X축 레이블 포맷:**
```typescript
function formatChartLabel(dateStr: string, period: string) {
  const d = new Date(dateStr)
  if (period === 'daily') return `${d.getMonth()+1}/${d.getDate()}`
  if (period === 'weekly') return `${d.getMonth()+1}/${d.getDate()}주`
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`
}
```

---

### Task 44 완료 조건

- [ ] `app/seller/orders/page.tsx` — 30초 interval 자동 갱신 (44A)
- [ ] `app/api/seller/orders/unread/route.ts` — PAID 주문 수 반환 API 신규 생성 (44B)
- [ ] `components/seller/SellerShell.tsx` (또는 레이아웃 파일) — 60초 폴링 + 주문 배지 UI (44C)
- [ ] `app/api/seller/dashboard/route.ts` — period 파라미터 (daily/weekly/monthly) 처리 (44D)
- [ ] `app/seller/dashboard/page.tsx` — 차트 기간 탭 UI + chartPeriod state (44D)
- [ ] git commit + push

---

## 기술 규칙
- v1 코드 구조 유지 — 새 기능은 별도 디렉토리 (`app/api/kakao/`, `app/(buyer)/kakao/`)
- DB 변경은 Prisma migration
- 토큰 생성: `crypto.randomBytes(16).toString('hex')` (nanoid 없음, Node.js built-in)
- 카카오 오픈빌더 응답 타임아웃: 5초 → DB 조회는 최소화
- Cron 인증: `CRON_SECRET` Bearer (기존 settlements cron과 동일 방식)

---

## Vercel 배포 환경변수 체크리스트 (운영팀 전달용)

```
필수:
[ ] DATABASE_URL
[ ] NEXTAUTH_SECRET (32자 이상)
[ ] NEXTAUTH_URL (프로덕션 URL, 예: https://liveorder.vercel.app)
[ ] PORTONE_API_KEY
[ ] PORTONE_STORE_ID
[ ] PORTONE_API_SECRET (환불 필수)
[ ] BLOB_READ_WRITE_TOKEN (Vercel Blob)
[ ] CRON_SECRET (카카오 세션 정리 cron 인증)
[ ] RESEND_API_KEY (이메일 알림)
[ ] KAKAO_BOT_ID=69d6729b9fac321ddc6b5d64

프론트엔드 (NEXT_PUBLIC):
[ ] NEXT_PUBLIC_PORTONE_STORE_ID
[ ] NEXT_PUBLIC_PORTONE_CHANNEL_KEY

선택:
[ ] ADMIN_EMAIL (미설정 시 admin@liveorder.app 폴백)
[ ] PLATFORM_FEE_RATE (미설정 시 0.025)
[ ] SETTLEMENT_DELAY_DAYS (미설정 시 3)
```
