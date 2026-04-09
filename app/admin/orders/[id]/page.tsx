'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminShell from '@/components/admin/AdminShell'
import RefundDialog from '@/components/admin/RefundDialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'

type OrderDetail = {
  id: string
  buyerName: string
  buyerPhone: string
  address: string
  addressDetail: string | null
  memo: string | null
  quantity: number
  amount: number
  status: string
  pgTid: string | null
  trackingNo: string | null
  carrier: string | null
  source: string
  createdAt: string
  code: {
    codeKey: string
    product: {
      name: string
      price: number
      seller: { id: string; name: string; email: string; phone: string }
    }
  }
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PAID: { label: '결제완료', variant: 'default' },
  SHIPPING: { label: '배송중', variant: 'secondary' },
  DELIVERED: { label: '배송완료', variant: 'outline' },
  SETTLED: { label: '정산완료', variant: 'secondary' },
  REFUNDED: { label: '환불', variant: 'destructive' },
}

const CARRIER_URLS: Record<string, string> = {
  'CJ대한통운': 'https://trace.cjlogistics.com/next/tracking.html?wblNo={trackingNo}',
  '로젠택배': 'https://www.logenpost.com/tracking/tracking.do?invoice={trackingNo}',
  '한진택배': 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038&schLang=KR&wblnumText2={trackingNo}',
  '롯데택배': 'https://www.lotteglogis.com/mobile/reservation/tracking/linkView?InvNo={trackingNo}',
  '우체국택배': 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?sid1={trackingNo}',
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refundTarget, setRefundTarget] = useState<{
    id: string
    amount: number
    buyerName: string
    productName: string
  } | null>(null)

  const fetchOrder = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/orders/${id}`)
      .then(r => { if (!r.ok) throw new Error('주문을 찾을 수 없습니다.'); return r.json() })
      .then(setOrder)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  if (loading) return <AdminShell><div className="p-8 text-muted-foreground">로딩 중...</div></AdminShell>
  if (error || !order) return <AdminShell><div className="p-8 text-destructive">{error || '주문을 찾을 수 없습니다.'}</div></AdminShell>

  const badge = STATUS_BADGE[order.status] ?? { label: order.status, variant: 'secondary' as const }
  const canRefund = ['PAID', 'SHIPPING', 'DELIVERED'].includes(order.status)
  const seller = order.code.product.seller

  const trackingUrl = order.carrier && order.trackingNo && CARRIER_URLS[order.carrier]
    ? CARRIER_URLS[order.carrier].replace('{trackingNo}', order.trackingNo)
    : null

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* 헤더 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/orders')}>
            <ArrowLeft className="h-4 w-4 mr-1" />주문 목록
          </Button>
          <h1 className="text-xl font-bold">주문 #{order.id.slice(-8).toUpperCase()}</h1>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {order.source === 'kakao' && <Badge variant="secondary">카카오</Badge>}
          {canRefund && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setRefundTarget({
                id: order.id,
                amount: order.amount,
                buyerName: order.buyerName,
                productName: order.code.product.name,
              })}
            >
              환불
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 주문 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-base">주문 정보</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="상품명" value={order.code.product.name} />
              <InfoRow label="코드키" value={order.code.codeKey} mono />
              <InfoRow label="수량" value={`${order.quantity}개`} />
              <InfoRow label="결제금액" value={`₩${order.amount.toLocaleString()}`} />
              <InfoRow label="결제일시" value={new Date(order.createdAt).toLocaleString('ko-KR')} />
              {order.pgTid && <InfoRow label="PG 거래ID" value={order.pgTid} mono />}
              <InfoRow label="채널" value={order.source === 'kakao' ? '카카오' : '웹'} />
            </CardContent>
          </Card>

          {/* 구매자 / 배송지 */}
          <Card>
            <CardHeader><CardTitle className="text-base">구매자 / 배송지</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="구매자명" value={order.buyerName} />
              <InfoRow label="연락처" value={order.buyerPhone} />
              <InfoRow label="주소" value={order.address} />
              {order.addressDetail && <InfoRow label="상세주소" value={order.addressDetail} />}
              {order.memo && <InfoRow label="메모" value={order.memo} />}
            </CardContent>
          </Card>

          {/* 셀러 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-base">셀러 정보</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">상호명</span>
                <Link
                  href={`/admin/sellers/${seller.id}`}
                  className="font-medium text-primary underline"
                >
                  {seller.name}
                </Link>
              </div>
              <InfoRow label="이메일" value={seller.email} />
              <InfoRow label="연락처" value={seller.phone} />
            </CardContent>
          </Card>

          {/* 배송 정보 (trackingNo 있을 때만) */}
          {order.trackingNo && (
            <Card>
              <CardHeader><CardTitle className="text-base">배송 정보</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.carrier && <InfoRow label="택배사" value={order.carrier} />}
                <InfoRow label="운송장번호" value={order.trackingNo} mono />
                {trackingUrl && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">배송 추적</span>
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline flex items-center gap-1"
                    >
                      배송 추적 <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {refundTarget && (
        <RefundDialog
          order={refundTarget}
          isOpen={!!refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => { setRefundTarget(null); fetchOrder() }}
        />
      )}
    </AdminShell>
  )
}
