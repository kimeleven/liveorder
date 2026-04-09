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
                  <Tooltip formatter={(v) => [`₩${Number(v ?? 0).toLocaleString()}`, '매출']} />
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
