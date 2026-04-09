'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AdminShell from '@/components/admin/AdminShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'

type SellerDetail = {
  id: string
  email: string
  name: string
  repName: string
  businessNo: string
  phone: string
  address: string | null
  bankAccount: string | null
  bankName: string | null
  tradeRegNo: string | null
  bizRegImageUrl: string | null
  status: string
  plan: string | null
  emailVerified: boolean
  createdAt: string
  stats: {
    productCount: number
    codeCount: number
    orderCount: number
    totalRevenue: number
    pendingSettlement: number
  }
}

type OrderItem = {
  id: string
  buyerName: string
  buyerPhone: string
  quantity: number
  amount: number
  status: string
  trackingNo: string | null
  carrier: string | null
  source: string
  createdAt: string
  code: { codeKey: string; product: { name: string } }
}

type Pagination = { page: number; totalPages: number; total: number }

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  SUSPENDED: 'destructive',
}

const statusLabel: Record<string, string> = {
  PENDING: '승인대기',
  APPROVED: '승인완료',
  SUSPENDED: '정지',
}

const orderStatusLabel: Record<string, string> = {
  PAID: '결제완료',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  SETTLED: '정산완료',
  REFUNDED: '환불',
}

const ORDER_STATUS_FILTERS = ['전체', 'PAID', 'SHIPPING', 'DELIVERED', 'REFUNDED']

export default function AdminSellerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [seller, setSeller] = useState<SellerDetail | null>(null)
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 })
  const [statusFilter, setStatusFilter] = useState('전체')
  const [orderPage, setOrderPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchSeller = useCallback(() => {
    fetch(`/api/admin/sellers/${id}`)
      .then(r => { if (!r.ok) throw new Error('셀러를 찾을 수 없습니다.'); return r.json() })
      .then(setSeller)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const fetchOrders = useCallback(() => {
    const params = new URLSearchParams({ page: String(orderPage) })
    if (statusFilter !== '전체') params.set('status', statusFilter)
    fetch(`/api/admin/sellers/${id}/orders?${params}`)
      .then(r => r.json())
      .then(data => {
        setOrders(data.data ?? [])
        setPagination(data.pagination ?? { page: 1, totalPages: 1, total: 0 })
      })
      .catch(() => {})
  }, [id, orderPage, statusFilter])

  useEffect(() => { fetchSeller() }, [fetchSeller])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  async function updateStatus(newStatus: string) {
    if (!seller) return
    const isDestructive = newStatus === 'SUSPENDED'
    if (isDestructive) {
      const actionLabel = '거부/정지'
      const confirmed = window.confirm(
        `${seller.name} 셀러를 ${actionLabel} 처리하시겠습니까?`
      )
      if (!confirmed) return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/sellers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('상태 변경 실패')
      const label =
        newStatus === 'APPROVED' ? '승인' : newStatus === 'SUSPENDED' ? '정지' : '복구'
      toast.success(`셀러가 ${label} 처리되었습니다.`)
      fetchSeller()
    } catch {
      toast.error('상태 변경에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <AdminShell><div className="p-8 text-muted-foreground">로딩 중...</div></AdminShell>
  if (error || !seller) return <AdminShell><div className="p-8 text-destructive">{error || '셀러를 찾을 수 없습니다.'}</div></AdminShell>

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/sellers')}>
            <ArrowLeft className="h-4 w-4 mr-1" />셀러 목록
          </Button>
          <h1 className="text-xl font-bold">{seller.name}</h1>
          <Badge variant={statusVariant[seller.status]}>{statusLabel[seller.status]}</Badge>
          <div className="flex gap-2 ml-auto">
            {seller.status === 'PENDING' && (
              <>
                <Button size="sm" disabled={submitting} onClick={() => updateStatus('APPROVED')}>
                  {submitting ? '처리 중...' : '승인'}
                </Button>
                <Button size="sm" variant="destructive" disabled={submitting} onClick={() => updateStatus('SUSPENDED')}>
                  거부
                </Button>
              </>
            )}
            {seller.status === 'APPROVED' && (
              <Button size="sm" variant="destructive" disabled={submitting} onClick={() => updateStatus('SUSPENDED')}>
                {submitting ? '처리 중...' : '정지'}
              </Button>
            )}
            {seller.status === 'SUSPENDED' && (
              <Button size="sm" variant="outline" disabled={submitting} onClick={() => updateStatus('APPROVED')}>
                {submitting ? '처리 중...' : '복구'}
              </Button>
            )}
          </div>
        </div>

        {/* 기본정보 + 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">셀러 기본정보</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="이메일" value={seller.email} />
              <InfoRow label="대표자명" value={seller.repName} />
              <InfoRow label="사업자번호" value={seller.businessNo} mono />
              <InfoRow label="연락처" value={seller.phone} />
              {seller.address && <InfoRow label="주소" value={seller.address} />}
              {seller.bankName && seller.bankAccount && (
                <InfoRow label="정산계좌" value={`${seller.bankName} ${seller.bankAccount}`} />
              )}
              {seller.tradeRegNo && <InfoRow label="통신판매번호" value={seller.tradeRegNo} mono />}
              {seller.bizRegImageUrl && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">사업자등록증</span>
                  <a
                    href={seller.bizRegImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-sm"
                  >
                    사업자등록증 보기 →
                  </a>
                </div>
              )}
              <InfoRow label="가입일" value={new Date(seller.createdAt).toLocaleDateString('ko-KR')} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="총 주문수" value={`${seller.stats.orderCount.toLocaleString()}건`} />
            <StatCard label="총 매출액" value={`₩${seller.stats.totalRevenue.toLocaleString()}`} />
            <StatCard label="활성 상품수" value={`${seller.stats.productCount.toLocaleString()}개`} />
            <StatCard label="대기 정산액" value={`₩${seller.stats.pendingSettlement.toLocaleString()}`} />
          </div>
        </div>

        {/* 주문 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">주문 목록 ({pagination.total}건)</CardTitle>
              <div className="flex gap-1">
                {ORDER_STATUS_FILTERS.map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={statusFilter === f ? 'default' : 'outline'}
                    onClick={() => { setStatusFilter(f); setOrderPage(1) }}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>주문ID</TableHead>
                  <TableHead>상품명</TableHead>
                  <TableHead>구매자</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>날짜</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      주문 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">#{order.id.slice(-8).toUpperCase()}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{order.code.product.name}</TableCell>
                      <TableCell>{order.buyerName}</TableCell>
                      <TableCell className="text-right">₩{order.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{orderStatusLabel[order.status] ?? order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orderPage <= 1}
                  onClick={() => setOrderPage(p => p - 1)}
                >
                  이전
                </Button>
                <span className="px-3 py-1 text-sm text-muted-foreground">
                  {orderPage} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orderPage >= pagination.totalPages}
                  onClick={() => setOrderPage(p => p + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
