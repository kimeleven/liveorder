'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminShell from '@/components/admin/AdminShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'

type SettlementDetail = {
  id: string
  amount: number
  fee: number
  pgFee: number
  netAmount: number
  status: string
  scheduledAt: string
  settledAt: string | null
  createdAt: string
  seller: {
    id: string
    name: string
    businessNo: string
    email: string
    phone: string
    bankName: string | null
    bankAccount: string | null
  }
  orders: {
    id: string
    buyerName: string
    buyerPhone: string
    quantity: number
    amount: number
    status: string
    source: string
    createdAt: string
    code: {
      codeKey: string
      product: { name: string }
    }
  }[]
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: '대기중', variant: 'secondary' },
  COMPLETED: { label: '완료', variant: 'default' },
  FAILED: { label: '실패', variant: 'destructive' },
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  PAID: '결제완료',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  SETTLED: '정산완료',
  REFUNDED: '환불',
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  )
}

export default function AdminSettlementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [settlement, setSettlement] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(false)

  const fetchSettlement = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/settlements/${id}`)
      .then(r => { if (!r.ok) throw new Error('정산 건을 찾을 수 없습니다.'); return r.json() })
      .then(setSettlement)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchSettlement() }, [fetchSettlement])

  async function handleComplete() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/admin/settlements/${id}`, { method: 'PATCH' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? '처리 중 오류가 발생했습니다.')
        return
      }
      fetchSettlement()
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) return <AdminShell><div className="p-8 text-muted-foreground">로딩 중...</div></AdminShell>
  if (error || !settlement) return <AdminShell><div className="p-8 text-destructive">{error || '정산 건을 찾을 수 없습니다.'}</div></AdminShell>

  const badge = STATUS_BADGE[settlement.status] ?? { label: settlement.status, variant: 'secondary' as const }
  const { seller } = settlement
  const bankInfo = seller.bankName ? `${seller.bankName} ${seller.bankAccount}` : '미등록'

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* 헤더 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/settlements')}>
            <ArrowLeft className="h-4 w-4 mr-1" />정산 목록
          </Button>
          <h1 className="text-xl font-bold">정산 #{settlement.id.slice(-8).toUpperCase()}</h1>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {settlement.status === 'PENDING' && (
            <Button
              size="sm"
              className="ml-auto"
              onClick={handleComplete}
              disabled={completing}
            >
              {completing ? '처리 중...' : '정산 완료 처리'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 정산 요약 */}
          <Card>
            <CardHeader><CardTitle className="text-base">정산 요약</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="거래금액" value={`₩${settlement.amount.toLocaleString()}`} />
              <InfoRow label="플랫폼 수수료" value={`₩${settlement.fee.toLocaleString()}`} />
              <InfoRow label="PG 수수료" value={`₩${settlement.pgFee.toLocaleString()}`} />
              <InfoRow label="실지급액" value={`₩${settlement.netAmount.toLocaleString()}`} />
              <InfoRow label="정산예정일" value={new Date(settlement.scheduledAt).toLocaleDateString('ko-KR')} />
              {settlement.settledAt && (
                <InfoRow label="정산완료일" value={new Date(settlement.settledAt).toLocaleString('ko-KR')} />
              )}
            </CardContent>
          </Card>

          {/* 셀러 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-base">셀러 정보</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">상호명</span>
                <Link href={`/admin/sellers/${seller.id}`} className="font-medium text-primary underline">
                  {seller.name}
                </Link>
              </div>
              <InfoRow label="사업자번호" value={seller.businessNo} />
              <InfoRow label="이메일" value={seller.email} />
              <InfoRow label="연락처" value={seller.phone} />
              <InfoRow label="정산 계좌" value={bankInfo} />
            </CardContent>
          </Card>
        </div>

        {/* 포함 주문 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">포함 주문 목록 ({settlement.orders.length}건)</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품명</TableHead>
                <TableHead>코드키</TableHead>
                <TableHead>구매자</TableHead>
                <TableHead>수량</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>채널</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>주문일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlement.orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    포함된 주문이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                settlement.orders.map(order => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <TableCell>{order.code.product.name}</TableCell>
                    <TableCell className="font-mono text-xs">{order.code.codeKey}</TableCell>
                    <TableCell>{order.buyerName}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>₩{order.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {order.source === 'kakao'
                        ? <Badge variant="secondary">카카오</Badge>
                        : <span className="text-muted-foreground text-xs">웹</span>
                      }
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminShell>
  )
}
