# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 49 완료 확인, Task 50 스펙 수립)_

---

## 프로젝트 개요

기존 v1 웹 기반 주문 플랫폼 위에 **카카오톡 챗봇 주문 플로우** 추가.
- v1: Next.js 기반 웹 플랫폼 (Phase 1+2+3 완료)
- v3: 카카오톡 오픈빌더 챗봇 연동 (Phase 4 완료, 재가동 대기 중)

---

## 현재 단계 요약

| Phase | 상태 |
|-------|------|
| Phase 1 — MVP | ✅ 완료 |
| Phase 2 — 고도화 | ✅ 완료 |
| Phase 3 — 확장 | 🔧 진행 중 (Task 50 예정) |
| Phase 4 — 카카오 챗봇 v3 | ✅ 완료 (재가동 대기 중) |

---

## 완료된 태스크 요약

| Task | 내용 |
|------|------|
| 1~33 | Phase 1+2 전체 (MVP + 고도화) |
| 34 | 사업자등록증 이미지 업로드 |
| 35 | KakaoPaySession 모델 + 카카오 결제 진입 페이지 |
| 36 | 카카오 webhook + session API (Phase 4 핵심) |
| 37 | seller.id 누락 버그 수정 |
| 38 | 오픈빌더 설정 문서 + 셀러 카카오 안내 UI |
| 39 | 카카오 세션 정리 cron + 웹훅 봇 ID 검증 |
| 40 | 주문 소스 추적 (web/kakao) |
| 41~42 | 세션 일회성 보장 + CSV source 컬럼 + 대시보드 채널 통계 |
| 43 | 운송장 일괄 CSV 업로드 |
| 44 | 주문 30초 자동갱신 + PAID 배지 + 주별/월별 매출 차트 |
| 45 | 셀러 설정 페이지 `/seller/settings` + GET/PATCH `/api/seller/me` + 비밀번호 변경 + 이용약관 동의 |
| 46 | 셀러 주문 상세 페이지 `/seller/orders/[id]` + `GET /api/seller/orders/[id]` + 주문 검색 (`?q=`) |
| 47 | 관리자 셀러 상세 페이지 `/admin/sellers/[id]` + `GET /api/admin/sellers/[id]` + `GET /api/admin/sellers/[id]/orders` + 목록 행 클릭 연결 |
| 48 | 관리자 주문 상세 페이지 `/admin/orders/[id]` + `GET /api/admin/orders/[id]` + 목록 행 클릭 연결 |
| 49 | 관리자 정산 상세 페이지 `/admin/settlements/[id]` + `GET/PATCH /api/admin/settlements/[id]` + 목록 행 클릭 연결 |

---

## Task 50 — 관리자 대시보드 개선

### 배경

현재 관리자 대시보드(`app/admin/dashboard/page.tsx`)는 숫자 통계 카드 4개만 존재.
셀러 대시보드는 recharts 매출 차트 + 채널 통계 + 최근 주문 테이블이 있는데,
관리자 대시보드는 이에 비해 매우 빈약하여 운영자가 전체 현황을 파악하기 어려움.

현재 API(`GET /api/admin/dashboard`)도 4개 집계 숫자만 반환 중.

### 목표

- 일별/주별/월별 **플랫폼 전체 매출 차트** 추가
- **승인 대기 셀러 목록** (최근 5건) — 클릭 → `/admin/sellers/[id]`
- **최근 주문 목록** (최근 5건) — 클릭 → `/admin/orders/[id]`
- 통계 카드 개선 — **오늘 매출 / 이번 달 매출** 분리 추가

### 서브태스크

---

#### 50A: `GET /api/admin/dashboard` 응답 확장

**수정 파일:** `app/api/admin/dashboard/route.ts`

현재 반환:
```typescript
{ pendingSellers, totalOrders, pendingSettlements, totalRevenue }
```

변경 후 반환:
```typescript
{
  pendingSellers: number
  totalOrders: number
  pendingSettlements: number
  totalRevenue: number        // 기존: 누적 수수료 수입
  todayRevenue: number        // 신규: 오늘 결제 완료 주문 합산
  thisMonthRevenue: number    // 신규: 이번달 결제 완료 주문 합산
  dailySales: { date: string; total: number }[]  // 신규: 기간별 매출 (period 파라미터)
  recentOrders: {
    id: string
    buyerName: string
    amount: number
    status: string
    source: string
    createdAt: string
    code: { product: { name: string } }
    seller: { name: string }
  }[]                         // 신규: 최근 주문 5건 (전체 셀러 통합)
  pendingSellerList: {
    id: string
    name: string
    email: string
    createdAt: string
  }[]                         // 신규: 승인 대기 셀러 최근 5건
}
```

**구현 상세:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'daily'  // daily | weekly | monthly

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // 기간별 dailySales 계산
  let groupByFormat: string
  let rangeStart: Date
  if (period === 'monthly') {
    groupByFormat = 'YYYY-MM'
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)  // 최근 12개월
  } else if (period === 'weekly') {
    rangeStart = new Date(now.getTime() - 11 * 7 * 24 * 60 * 60 * 1000)  // 최근 12주
    groupByFormat = 'YYYY-IW'
  } else {
    rangeStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)  // 최근 7일
    groupByFormat = 'YYYY-MM-DD'
  }

  const [
    pendingSellers,
    totalOrders,
    pendingSettlements,
    feeSum,
    todayRevenue,
    thisMonthRevenue,
    rawDailySales,
    recentOrders,
    pendingSellerList,
  ] = await Promise.all([
    prisma.seller.count({ where: { status: 'PENDING' } }),
    prisma.order.count(),
    prisma.settlement.count({ where: { status: 'PENDING' } }),
    prisma.settlement.aggregate({ _sum: { fee: true } }).then(r => Number(r._sum.fee ?? 0)),

    // 오늘 매출 (PAID 이상 주문 합산)
    prisma.order.aggregate({
      _sum: { amount: true },
      where: {
        status: { notIn: ['REFUNDED'] },
        createdAt: { gte: todayStart },
      },
    }).then(r => Number(r._sum.amount ?? 0)),

    // 이번달 매출
    prisma.order.aggregate({
      _sum: { amount: true },
      where: {
        status: { notIn: ['REFUNDED'] },
        createdAt: { gte: monthStart },
      },
    }).then(r => Number(r._sum.amount ?? 0)),

    // 기간별 매출 (Raw SQL for grouping)
    prisma.$queryRaw<{ date: string; total: bigint }[]>`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'Asia/Seoul', ${
          period === 'monthly' ? 'YYYY-MM' :
          period === 'weekly'  ? 'IYYY-IW' :
          'YYYY-MM-DD'
        }) AS date,
        SUM(amount) AS total
      FROM "Order"
      WHERE status NOT IN ('REFUNDED')
        AND "createdAt" >= ${rangeStart}
      GROUP BY 1
      ORDER BY 1
    `,

    // 최근 주문 5건 (전체 셀러)
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        buyerName: true,
        amount: true,
        status: true,
        source: true,
        createdAt: true,
        code: { select: { product: { select: { name: true } } } },
        seller: { select: { name: true } },
      },
    }),

    // 승인 대기 셀러 최근 5건
    prisma.seller.findMany({
      take: 5,
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ])

  const dailySales = rawDailySales.map(r => ({
    date: r.date,
    total: Number(r.total),
  }))

  return NextResponse.json({
    pendingSellers,
    totalOrders,
    pendingSettlements,
    totalRevenue: feeSum,
    todayRevenue,
    thisMonthRevenue,
    dailySales,
    recentOrders,
    pendingSellerList,
  })
}
```

**완료 조건:**
- [ ] `period` 쿼리 파라미터 지원 (daily/weekly/monthly)
- [ ] `todayRevenue`, `thisMonthRevenue` 반환
- [ ] `dailySales` 배열 반환 (BigInt → number 변환 필수)
- [ ] `recentOrders` 최근 5건 반환 (seller.name 포함)
- [ ] `pendingSellerList` 최근 5건 반환

---

#### 50B: 관리자 대시보드 페이지 UI 개선

**수정 파일:** `app/admin/dashboard/page.tsx`

**레이아웃:**
```
┌──────────────────────────────────────────────────────────────────┐
│ 관리자 대시보드                                                     │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ 승인대기  │ 총주문   │ 정산대기  │ 수수료수입│ 오늘매출 │ 이번달   │
│ N건      │ N건      │ N건      │ ₩N       │ ₩N       │ ₩N       │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┤
│ 플랫폼 매출 추이           [일별] [주별] [월별]                    │
│ (LineChart 200px)                                                  │
├─────────────────────────────┬────────────────────────────────────┤
│ 승인 대기 셀러 (N건)         │ 최근 주문                          │
│ 상호명 | 이메일 | 가입일     │ 주문번호 | 셀러 | 상품 | 금액 | 상태│
│ [행 클릭 → /admin/sellers/id]│ [행 클릭 → /admin/orders/id]      │
└─────────────────────────────┴────────────────────────────────────┘
```

**구현 포인트:**

1. `'use client'` + `useRouter`
2. `fetchDashboard(period: string)` 함수 — `GET /api/admin/dashboard?period=${period}` 호출
3. `chartPeriod` state (`'daily' | 'weekly' | 'monthly'`), 버튼 클릭 시 재조회
4. 통계 카드 6개로 확장:
   ```typescript
   const cards = [
     { title: '승인 대기 셀러', value: stats.pendingSellers, icon: Users, color: 'text-orange-600' },
     { title: '총 주문', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-600' },
     { title: '정산 대기', value: stats.pendingSettlements, icon: Wallet, color: 'text-purple-600' },
     { title: '수수료 수입 (누적)', value: `₩${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
     { title: '오늘 매출', value: `₩${(stats.todayRevenue ?? 0).toLocaleString()}`, icon: AlertTriangle, color: 'text-red-500' },
     { title: '이번달 매출', value: `₩${(stats.thisMonthRevenue ?? 0).toLocaleString()}`, icon: Calendar, color: 'text-indigo-600' },
   ]
   ```
5. 매출 차트: `recharts` `LineChart` — 셀러 대시보드(`app/seller/dashboard/page.tsx`)와 동일한 구조로 구현
   - XAxis tickFormatter: daily `M/D`, weekly `M/D주`, monthly `YYYY.MM`
   - YAxis tickFormatter: `v >= 10000 ? ${(v/10000).toFixed(0)}만 : v`
   - stroke: `#6366f1` (동일 컬러)
6. 승인 대기 셀러 테이블:
   - 컬럼: 상호명, 이메일, 가입일
   - 행 클릭: `router.push('/admin/sellers/' + seller.id)`
   - 빈 상태: "승인 대기 중인 셀러가 없습니다."
7. 최근 주문 테이블:
   - 컬럼: 주문번호(8자 앞, 대문자, mono), 셀러명, 상품명, 금액, 상태 배지, 채널 배지
   - 행 클릭: `router.push('/admin/orders/' + order.id)`
   - source === 'kakao' → `<Badge variant="secondary">카카오</Badge>`, 아니면 `<Badge variant="outline">웹</Badge>`
   - 빈 상태: "아직 주문이 없습니다."
8. import 추가: `TrendingUp, Calendar` from `lucide-react`, `LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer` from `recharts`

**완료 조건:**
- [ ] 통계 카드 6개 (오늘 매출, 이번달 매출 추가)
- [ ] 매출 추이 LineChart (일별/주별/월별 토글)
- [ ] 승인 대기 셀러 테이블 + 행 클릭 → `/admin/sellers/[id]`
- [ ] 최근 주문 테이블 + 행 클릭 → `/admin/orders/[id]`
- [ ] 에러/로딩 처리 (catch 후 에러 메시지 표시)
- [ ] `AdminShell` 래핑 유지

---

## Task 51 예고 — 관리자 셀러 승인 즉시 처리 UX 개선

현재 관리자 셀러 목록/상세에서 승인 처리 후 페이지 새로고침 필요.
Task 47에서 만든 셀러 상세 페이지에서 승인/거부/정지 버튼 추가 및 즉시 상태 반영 개선 예정.

---

*최종 업데이트: 2026-04-09 (Planner)*
