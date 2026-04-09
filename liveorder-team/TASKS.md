# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Dev1 — Task 50 완료: 관리자 대시보드 개선)_

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

### Task 50: 관리자 대시보드 개선 ✅

**완료일:** 2026-04-09
**우선순위:** MEDIUM
**이유:** 현재 관리자 대시보드는 숫자 4개만 표시. 셀러 대시보드(매출 차트 + 최근 주문)에 비해 빈약함. 운영자가 전체 플랫폼 현황을 한눈에 파악할 수 있게 개선.

---

#### 50A: `GET /api/admin/dashboard` 응답 확장

**수정 파일:** `app/api/admin/dashboard/route.ts`

**추가할 반환 필드:**
- `todayRevenue: number` — 오늘 결제 완료 주문 합산 (REFUNDED 제외)
- `thisMonthRevenue: number` — 이번달 결제 완료 주문 합산
- `dailySales: { date: string; total: number }[]` — 기간별 매출 (`period` 쿼리 파라미터: daily/weekly/monthly)
- `recentOrders` — 최근 주문 5건 (id, buyerName, amount, status, source, createdAt, code.product.name, seller.name)
- `pendingSellerList` — 승인 대기 셀러 5건 (id, name, email, createdAt)

**구현 상세 (전체 route.ts 교체):**

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
  const period = searchParams.get('period') ?? 'daily'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const rangeStart =
    period === 'monthly'
      ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
      : period === 'weekly'
      ? new Date(now.getTime() - 11 * 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)

  const dateFormat =
    period === 'monthly' ? 'YYYY-MM' :
    period === 'weekly'  ? 'IYYY-IW' :
    'YYYY-MM-DD'

  const [
    pendingSellers,
    totalOrders,
    pendingSettlements,
    feeSum,
    todayAgg,
    monthAgg,
    rawDailySales,
    recentOrders,
    pendingSellerList,
  ] = await Promise.all([
    prisma.seller.count({ where: { status: 'PENDING' } }),
    prisma.order.count(),
    prisma.settlement.count({ where: { status: 'PENDING' } }),
    prisma.settlement
      .aggregate({ _sum: { fee: true } })
      .then(r => Number(r._sum.fee ?? 0)),
    prisma.order.aggregate({
      _sum: { amount: true },
      where: { status: { notIn: ['REFUNDED'] }, createdAt: { gte: todayStart } },
    }).then(r => Number(r._sum.amount ?? 0)),
    prisma.order.aggregate({
      _sum: { amount: true },
      where: { status: { notIn: ['REFUNDED'] }, createdAt: { gte: monthStart } },
    }).then(r => Number(r._sum.amount ?? 0)),
    prisma.$queryRaw<{ date: string; total: bigint }[]>`
      SELECT TO_CHAR("createdAt" AT TIME ZONE 'Asia/Seoul', ${dateFormat}) AS date,
             SUM(amount) AS total
      FROM "Order"
      WHERE status NOT IN ('REFUNDED') AND "createdAt" >= ${rangeStart}
      GROUP BY 1 ORDER BY 1
    `,
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
    prisma.seller.findMany({
      take: 5,
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ])

  return NextResponse.json({
    pendingSellers,
    totalOrders,
    pendingSettlements,
    totalRevenue: feeSum,
    todayRevenue: todayAgg,
    thisMonthRevenue: monthAgg,
    dailySales: rawDailySales.map(r => ({ date: r.date, total: Number(r.total) })),
    recentOrders,
    pendingSellerList,
  })
}
```

**완료 조건:**
- [x] `period` 쿼리 파라미터 지원 (daily/weekly/monthly)
- [x] `todayRevenue`, `thisMonthRevenue` 반환
- [x] `dailySales` 배열 반환 (BigInt → number 변환)
- [x] `recentOrders` 최근 5건 (seller.name 포함)
- [x] `pendingSellerList` 최근 5건

---

#### 50B: 관리자 대시보드 페이지 UI 개선

**수정 파일:** `app/admin/dashboard/page.tsx`

**전체 교체 구현:**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, ShoppingCart, Wallet, TrendingUp, AlertTriangle, Calendar,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface PendingSeller {
  id: string
  name: string
  email: string
  createdAt: string
}

interface RecentOrder {
  id: string
  buyerName: string
  amount: number
  status: string
  source: string
  createdAt: string
  code: { product: { name: string } }
  seller: { name: string }
}

interface AdminStats {
  pendingSellers: number
  totalOrders: number
  pendingSettlements: number
  totalRevenue: number
  todayRevenue: number
  thisMonthRevenue: number
  dailySales: { date: string; total: number }[]
  recentOrders: RecentOrder[]
  pendingSellerList: PendingSeller[]
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAID: '결제완료',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  SETTLED: '정산완료',
  REFUNDED: '환불',
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats>({
    pendingSellers: 0,
    totalOrders: 0,
    pendingSettlements: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    thisMonthRevenue: 0,
    dailySales: [],
    recentOrders: [],
    pendingSellerList: [],
  })
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [error, setError] = useState<string | null>(null)

  async function fetchDashboard(period = chartPeriod) {
    try {
      const res = await fetch(`/api/admin/dashboard?period=${period}`)
      const data = await res.json()
      setStats(data)
    } catch {
      setError('대시보드 데이터를 불러오지 못했습니다. 새로고침해 주세요.')
    }
  }

  useEffect(() => { fetchDashboard('daily') }, [])
  useEffect(() => { fetchDashboard(chartPeriod) }, [chartPeriod])

  const cards = [
    { title: '승인 대기 셀러', value: stats.pendingSellers, icon: Users, color: 'text-orange-600' },
    { title: '총 주문', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-600' },
    { title: '정산 대기', value: stats.pendingSettlements, icon: Wallet, color: 'text-purple-600' },
    { title: '수수료 수입 (누적)', value: `₩${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
    { title: '오늘 매출', value: `₩${(stats.todayRevenue ?? 0).toLocaleString()}`, icon: AlertTriangle, color: 'text-red-500' },
    { title: '이번달 매출', value: `₩${(stats.thisMonthRevenue ?? 0).toLocaleString()}`, icon: Calendar, color: 'text-indigo-600' },
  ]

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* 통계 카드 6개 */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 매출 차트 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">플랫폼 매출 추이</CardTitle>
              <div className="flex gap-1">
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
            </div>
          </CardHeader>
          <CardContent>
            {stats.dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.dailySales}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v)
                      if (chartPeriod === 'monthly') return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
                      return `${d.getMonth() + 1}/${d.getDate()}${chartPeriod === 'weekly' ? '주' : ''}`
                    }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v: number) => [`₩${v.toLocaleString()}`, '매출']} />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 하단 2컬럼: 승인 대기 셀러 + 최근 주문 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 승인 대기 셀러 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                승인 대기 셀러 ({stats.pendingSellerList.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.pendingSellerList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상호명</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>가입일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.pendingSellerList.map((s) => (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/admin/sellers/${s.id}`)}
                      >
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  승인 대기 중인 셀러가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 최근 주문 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 주문</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>셀러</TableHead>
                      <TableHead>상품</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentOrders.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/admin/orders/${o.id}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          {o.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{o.seller.name}</TableCell>
                        <TableCell className="text-sm">{o.code.product.name}</TableCell>
                        <TableCell className="text-sm">₩{o.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {ORDER_STATUS_LABELS[o.status] ?? o.status}
                            </Badge>
                            {o.source === 'kakao' ? (
                              <Badge variant="secondary" className="text-xs">카카오</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">웹</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  아직 주문이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}
```

**완료 조건:**
- [x] 통계 카드 6개 (오늘 매출, 이번달 매출 포함)
- [x] 매출 차트 + 일별/주별/월별 토글
- [x] 승인 대기 셀러 테이블 + 클릭 → `/admin/sellers/[id]`
- [x] 최근 주문 테이블 + 클릭 → `/admin/orders/[id]`
- [x] 에러 배너 표시
- [x] `AdminShell` 래핑 유지

---

## ✅ 완료된 작업

### Task 49: 관리자 정산 상세 페이지 ✅

**완료일:** 2026-04-09

- [x] 49A: `GET /api/admin/settlements/[id]` + `PATCH /api/admin/settlements/[id]` — 신규 파일 생성 (`app/api/admin/settlements/[id]/route.ts`)
- [x] 49B: `/admin/settlements/[id]` 페이지 신규 생성 (`app/admin/settlements/[id]/page.tsx`)
- [x] 49C: `/admin/settlements` 목록 행 클릭 → `router.push('/admin/settlements/' + id)` 연결

---

### Task 48: 관리자 주문 상세 페이지 ✅

**완료일:** 2026-04-09

- [x] 48A: `GET /api/admin/orders/[id]` — 신규 파일 생성 (`app/api/admin/orders/[id]/route.ts`)
- [x] 48B: `/admin/orders/[id]` 페이지 신규 생성 (`app/admin/orders/[id]/page.tsx`)
- [x] 48C: `/admin/orders` 목록 행 클릭 → `router.push('/admin/orders/' + id)` 연결

---

### Task 47: 관리자 셀러 상세 페이지 ✅

**완료일:** 2026-04-09

- [x] 47A: `GET /api/admin/sellers/[id]` — 기존 파일에 GET 핸들러 추가 (`app/api/admin/sellers/[id]/route.ts`)
- [x] 47B: `GET /api/admin/sellers/[id]/orders` 신규 생성 (`app/api/admin/sellers/[id]/orders/route.ts`)
- [x] 47C: `/admin/sellers/[id]` 페이지 신규 생성 (`app/admin/sellers/[id]/page.tsx`)
- [x] 47D: `/admin/sellers` 목록 행 클릭 → `router.push('/admin/sellers/' + id)` 연결

---

### Task 46: 셀러 주문 상세 페이지 + 주문 검색 ✅

**완료일:** 2026-04-09

- [x] 46A: `GET /api/seller/orders/[id]` — 셀러 소유 주문 상세 API (`app/api/seller/orders/[id]/route.ts`)
- [x] 46B: `GET /api/seller/orders` — `?q=` 검색 파라미터 추가 (구매자명/전화번호)
- [x] 46C: `/seller/orders/[id]` 상세 페이지 UI (`app/seller/orders/[id]/page.tsx`) — 주문정보/배송지/배송정보 3카드
- [x] 46D: `/seller/orders` 목록 행 클릭 → `router.push('/seller/orders/' + id)` 연결

---

### Task 45: 셀러 설정 페이지 ✅

- [x] 45A: `GET/PATCH /api/seller/me` — 전체 필드 조회/수정
- [x] 45B: `POST /api/seller/me/password` — 비밀번호 변경
- [x] 45C: `/seller/settings` 설정 페이지 UI
- [x] 45D: 회원가입 폼 이용약관 + 판매자 약관 동의 체크박스

---

### Task 44: 셀러 주문 실시간 현황 개선 ✅

- [x] 주문 목록 30초 자동갱신
- [x] 미처리(PAID) 주문 수 배지 (헤더)
- [x] 매출 통계 주별/월별 차트

---

### Task 43: 운송장 일괄 CSV 업로드 ✅

- [x] `POST /api/seller/orders/tracking/bulk`
- [x] 셀러 주문 페이지 CSV 업로드 UI

---

### Task 41~42: 카카오 세션 일회성 + CSV source + 채널별 통계 ✅

- [x] KakaoPaySession 일회성 사용 보장
- [x] 주문 source 컬럼 CSV export 포함
- [x] 대시보드 카카오/웹 채널별 통계

---

### Task 40: 주문 소스 추적 ✅

- [x] `Order.source` 필드 (web/kakao)
- [x] 카카오 경로 주문에 `source: 'kakao'` 설정

---

### Task 39: 카카오 세션 정리 cron + 봇 ID 검증 ✅

- [x] `POST /api/cron/kakao-session-cleanup`
- [x] webhook 봇 ID 검증 (KAKAO_BOT_ID)

---

### Task 38: 오픈빌더 설정 문서 + 셀러 카카오 안내 UI ✅

- [x] `docs/kakao-openbuilder-setup.md`
- [x] 셀러 코드 페이지 카카오 공지 복사 버튼
- [x] 셀러 대시보드 카카오 채널 안내 카드

---

### Task 35~37: 카카오 결제 페이지 + 세션 API + 버그수정 ✅

- [x] KakaoPaySession 모델 (Prisma migration)
- [x] `/kakao/[token]` 구매자 결제 진입 페이지
- [x] `GET /api/kakao/session/[token]`
- [x] `POST /api/kakao/webhook` (오픈빌더 스킬 서버)
- [x] seller.id 누락 버그 수정

---

### Task 34: 사업자등록증 이미지 업로드 ✅

- [x] `POST /api/seller/biz-reg-upload` (Vercel Blob)
- [x] 회원가입 폼 업로드 UI
- [x] Prisma `bizRegImageUrl` 필드

---

### Task 1~33: Phase 1+2 전체 ✅

전체 MVP + 고도화 기능 완료. QA_REPORT.md 참조.
