'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SellerShell from '@/components/seller/SellerShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const CARRIER_URLS: Record<string, string> = {
  'CJ대한통운': 'https://trace.cjlogistics.com/next/tracking.html?wblNo={trackingNo}',
  '로젠택배': 'https://www.logenpost.com/tracking/tracking.do?invoice={trackingNo}',
  '한진택배': 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038&schLang=KR&wblnumText2={trackingNo}',
  '롯데택배': 'https://www.lotteglogis.com/mobile/reservation/tracking/linkView?InvNo={trackingNo}',
  '우체국택배': 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?sid1={trackingNo}',
}

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
  code: { codeKey: string; product: { name: string; price: number } }
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PAID: { label: '결제완료', variant: 'default' },
  SHIPPING: { label: '배송중', variant: 'secondary' },
  DELIVERED: { label: '배송완료', variant: 'secondary' },
  SETTLED: { label: '정산완료', variant: 'outline' },
  REFUNDED: { label: '환불', variant: 'destructive' },
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/seller/orders/${id}`)
      .then(r => { if (!r.ok) throw new Error('주문을 찾을 수 없습니다.'); return r.json() })
      .then(setOrder)
      .catch(e => setError(e.message))
  }, [id])

  if (error) return <SellerShell><div className="p-8 text-destructive">{error}</div></SellerShell>
  if (!order) return <SellerShell><div className="p-8 text-muted-foreground">로딩 중...</div></SellerShell>

  const status = STATUS_MAP[order.status] ?? { label: order.status, variant: 'outline' as const }
  const trackingUrl = order.trackingNo && order.carrier
    ? CARRIER_URLS[order.carrier]?.replace('{trackingNo}', order.trackingNo)
    : null

  return (
    <SellerShell>
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />주문 목록
          </Button>
          <h1 className="text-xl font-bold">주문 #{order.id.slice(-8).toUpperCase()}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
          {order.source === 'kakao' && <Badge variant="secondary">카카오</Badge>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">주문 정보</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="상품명" value={order.code.product.name} />
              <Row label="코드" value={order.code.codeKey} mono />
              <Row label="수량" value={`${order.quantity}개`} />
              <Row label="결제금액" value={`₩${order.amount.toLocaleString()}`} />
              <Row label="결제일시" value={new Date(order.createdAt).toLocaleString('ko-KR')} />
              {order.pgTid && <Row label="PG 거래ID" value={order.pgTid} mono />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">구매자 / 배송지</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="구매자" value={order.buyerName} />
              <Row label="연락처" value={order.buyerPhone} />
              <Row label="주소" value={order.address} />
              {order.addressDetail && <Row label="상세주소" value={order.addressDetail} />}
              {order.memo && <Row label="메모" value={order.memo} />}
            </CardContent>
          </Card>
        </div>

        {(order.trackingNo || order.carrier) && (
          <Card>
            <CardHeader><CardTitle className="text-base">배송 정보</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.carrier && <Row label="택배사" value={order.carrier} />}
              {order.trackingNo && <Row label="운송장번호" value={order.trackingNo} mono />}
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-primary underline text-sm">
                  배송 추적 →
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SellerShell>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
