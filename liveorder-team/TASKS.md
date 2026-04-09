# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Planner — Task 45 완료 확인 + Task 46 스펙 수립)_

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

### Task 46: 셀러 주문 상세 페이지 + 주문 검색

**우선순위:** HIGH
**이유:** 현재 셀러 주문 목록(`/seller/orders`)에서 행 클릭 시 아무 동작 없음. 주문 상세(전체 주소, 메모, PG 거래ID 등)를 확인할 방법이 없어 운영 불편. 또한 구매자명/전화번호 검색 불가.

---

#### 46A: `GET /api/seller/orders/[id]` 신규 생성

**파일 신규 생성:** `app/api/seller/orders/[id]/route.ts`

> ⚠️ 주의: `app/api/seller/orders/[id]/tracking/route.ts`는 이미 존재. 새 파일은 `[id]/route.ts`로 생성. 기존 tracking은 건드리지 말 것.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const order = await prisma.order.findFirst({
    where: {
      id,
      code: { product: { sellerId: session.user.id } },
    },
    select: {
      id: true,
      buyerName: true,
      buyerPhone: true,
      address: true,
      addressDetail: true,
      memo: true,
      quantity: true,
      amount: true,
      status: true,
      pgTid: true,
      trackingNo: true,
      carrier: true,
      source: true,
      createdAt: true,
      code: {
        select: {
          codeKey: true,
          product: {
            select: { name: true, price: true },
          },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(order)
}
```

**완료 조건:**
- [ ] `GET /api/seller/orders/[id]` — 셀러 소유 주문만 조회 (다른 셀러 404)
- [ ] 전체 필드 반환 (address, addressDetail, memo, pgTid, source 포함)

---

#### 46B: `/seller/orders/[id]/page.tsx` 신규 생성

**파일 신규 생성:** `app/seller/orders/[id]/page.tsx`

**레이아웃 (3카드 구조):**
```
┌─────────────────────────────────────────────────┐
│ ← 주문 목록  |  주문 #[id 뒤 8자리]  [상태배지]   │
├──────────────────────┬──────────────────────────┤
│ 주문 정보             │ 구매자 / 배송지            │
│ 상품명               │ 구매자명                   │
│ 코드                 │ 연락처                     │
│ 수량                 │ 주소                       │
│ 결제금액             │ 상세주소                   │
│ 결제일시             │ 메모                       │
│ PG 거래ID            │                           │
├──────────────────────┴──────────────────────────┤
│ 배송 정보 (운송장 있을 때만)                       │
│ 택배사 | 운송장번호 | [배송추적 →]                 │
└─────────────────────────────────────────────────┘
```

**구현 골격:**
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SellerShell from '@/components/seller/SellerShell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

// carrier URL 매핑 — lib/carrier-urls.ts 있으면 import, 없으면 인라인 정의
const CARRIER_URLS: Record<string, string> = {
  'CJ대한통운': 'https://trace.cjlogistics.com/next/tracking.html?wblNo={trackingNo}',
  '로젠택배': 'https://www.logenpost.com/tracking/tracking.do?invoice={trackingNo}',
  '한진택배': 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038&schLang=KR&wblnumText2={trackingNo}',
  '롯데택배': 'https://www.lotteglogis.com/mobile/reservation/tracking/linkView?InvNo={trackingNo}',
  '우체국택배': 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?sid1={trackingNo}',
}

type OrderDetail = {
  id: string
  buyerName: string; buyerPhone: string; address: string
  addressDetail: string | null; memo: string | null
  quantity: number; amount: number; status: string
  pgTid: string | null; trackingNo: string | null; carrier: string | null
  source: string; createdAt: string
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
```

**완료 조건:**
- [ ] `/seller/orders/[id]` 접근 시 상세 페이지 렌더링
- [ ] 주문 정보 + 구매자/배송지 + 배송 정보 3카드
- [ ] 카카오 주문 배지, 배송 추적 링크
- [ ] "주문 목록" 뒤로가기 버튼

---

#### 46C: 주문 목록 API 검색 파라미터 + UI

**파일 수정:** `app/api/seller/orders/route.ts`

기존 `statusParam` 처리 부분 아래에 추가:

```typescript
const q = searchParams.get('q')?.trim() || ''
```

그리고 `findMany` where 절을 확장:

```typescript
// 기존 where 절
const where = {
  code: { product: { sellerId: session.user.id } },
  ...(statusParam && validStatuses.includes(statusParam) ? { status: statusParam as OrderStatus } : {}),
}
```

를 아래로 변경:

```typescript
const where = {
  code: { product: { sellerId: session.user.id } },
  ...(statusParam && validStatuses.includes(statusParam) ? { status: statusParam as OrderStatus } : {}),
  ...(q ? {
    OR: [
      { buyerName: { contains: q, mode: 'insensitive' as const } },
      { buyerPhone: { contains: q } },
    ]
  } : {}),
}
```

**파일 수정:** `app/seller/orders/page.tsx`

1. `useState` 추가:
```typescript
const [searchQuery, setSearchQuery] = useState('')
const [searchInput, setSearchInput] = useState('')
```

2. `fetchOrders` 파라미터 확장:
```typescript
async function fetchOrders(currentPage = page, currentStatus = statusFilter, currentQuery = searchQuery) {
  // ...
  if (currentStatus) params.set('status', currentStatus)
  if (currentQuery) params.set('q', currentQuery)
  // ...
}
```

3. `useEffect` 수정 (searchQuery 의존성 추가):
```typescript
useEffect(() => {
  fetchOrders(page, statusFilter, searchQuery)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [page, statusFilter, searchQuery])
```

4. 기존 상태 필터 Select 옆에 검색 form 추가 (헤더 toolbar 영역):
```tsx
<form onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput); setPage(1) }}
  className="flex gap-2 items-center">
  <Input
    placeholder="구매자명 또는 전화번호"
    value={searchInput}
    onChange={e => setSearchInput(e.target.value)}
    className="w-44 h-8"
  />
  <Button type="submit" variant="outline" size="sm">검색</Button>
  {searchQuery && (
    <Button type="button" variant="ghost" size="sm"
      onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1) }}>
      초기화
    </Button>
  )}
</form>
```

---

#### 46D: 주문 목록 행 클릭 → 상세 페이지 이동

**파일 수정:** `app/seller/orders/page.tsx`

```typescript
import { useRouter } from 'next/navigation'
// 컴포넌트 내부
const router = useRouter()
```

TableRow에 클릭 핸들러:
```tsx
<TableRow
  key={order.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => router.push(`/seller/orders/${order.id}`)}
>
```

버튼들에 `stopPropagation` 추가 (운송장 등록, CSV 업로드, 다운로드 등 모든 버튼):
```tsx
onClick={e => {
  e.stopPropagation()
  openTrackingDialog(order.id)
}}
```

---

### Task 46 전체 완료 조건 ✅ (2026-04-09 완료, commit 67cae8b)

- [x] `app/api/seller/orders/[id]/route.ts` — GET 주문 상세 API 신규 (46A)
- [x] `app/seller/orders/[id]/page.tsx` — 주문 상세 페이지 신규 (46B)
- [x] `app/api/seller/orders/route.ts` — `q` 검색 파라미터 추가 (46C)
- [x] `app/seller/orders/page.tsx` — 검색 UI + 행 클릭 → 상세 이동 (46C+46D)
- [x] git commit + push

---

---

## ✅ (완료) Task 45: 셀러 설정 페이지

**우선순위:** HIGH
**이유:** `SellerShell` 네비게이션에 "설정" 메뉴가 있지만 `/seller/settings` 페이지가 없어 404. 셀러가 계좌/연락처 수정 불가. 이용약관 동의 체크박스도 없음 (법적 의무).

---

#### 45A: `/api/seller/me` PATCH 핸들러 + GET 필드 확장

**파일 수정:** `app/api/seller/me/route.ts`

**GET 수정** — 기존에는 `status, name, email`만 반환. 설정 페이지용으로 필드 확장:
```typescript
select: {
  status: true, name: true, email: true,
  repName: true, businessNo: true,
  phone: true, address: true,
  bankAccount: true, bankName: true, tradeRegNo: true,
  plan: true, createdAt: true,
}
```

**PATCH 추가** — 허용 필드: `phone`, `address`, `bankAccount`, `bankName`, `tradeRegNo`
```typescript
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const allowed = ['phone', 'address', 'bankAccount', 'bankName', 'tradeRegNo'] as const
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'string') data[key] = body[key].trim()
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const seller = await prisma.seller.update({
    where: { id: session.user.id },
    data,
    select: { phone: true, address: true, bankAccount: true, bankName: true, tradeRegNo: true },
  })

  return NextResponse.json(seller)
}
```

**완료 조건:**
- [x] `GET /api/seller/me` — 전체 필드 반환 (phone, address, bankAccount, bankName, tradeRegNo, plan, createdAt 포함)
- [x] `PATCH /api/seller/me` — 허용 필드만 수정, 401/400 처리

---

#### 45B: 비밀번호 변경 API 신규 생성

**파일 신규 생성:** `app/api/seller/me/password/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다' }, { status: 400 })
  }

  const seller = await prisma.seller.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })
  if (!seller) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword, seller.password)
  if (!valid) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.seller.update({
    where: { id: session.user.id },
    data: { password: hashed },
  })

  return NextResponse.json({ ok: true })
}
```

**완료 조건:**
- [x] `POST /api/seller/me/password` — 현재 비밀번호 bcrypt 검증 후 새 비밀번호 저장
- [x] 8자 미만 → 400, 현재 비밀번호 불일치 → 400

---

#### 45C: 설정 페이지 신규 생성

**파일 신규 생성:** `app/seller/settings/page.tsx`

**먼저 toast/알림 방식 확인:**
```bash
grep -r "toast\|useToast\|sonner" /Users/a1111/eddy-agent/liveorder/components --include="*.tsx" -l | head -3
grep -r "toast\|useToast\|sonner" /Users/a1111/eddy-agent/liveorder/app/seller --include="*.tsx" | head -5
```

**레이아웃:**
```
페이지 제목: "설정"
┌────────────────────────────────┐  ┌────────────────────────────────┐
│ 기본 정보 (읽기 전용)           │  │ 연락처 / 정산 계좌 (수정 가능)  │
│ 이름: 홍길동 상호               │  │ 연락처: [          ]           │
│ 이메일: a@b.com                │  │ 주소: [                      ] │
│ 사업자번호: 123-45-67890        │  │ 은행명: [         ]           │
│ 대표자명: 홍길동                │  │ 계좌번호: [                  ] │
│ 플랜: FREE                     │  │ 통신판매업신고번호: [         ] │
│ 가입일: 2026-04-01             │  │ [저장]                         │
└────────────────────────────────┘  └────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ 비밀번호 변경                                                       │
│ 현재 비밀번호: [__________]                                        │
│ 새 비밀번호:   [__________] (8자 이상)                             │
│ 새 비밀번호 확인: [__________]                                     │
│ [변경]                                                             │
└────────────────────────────────────────────────────────────────────┘
```

**구현 골격:**
```typescript
'use client'
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SellerProfile = {
  name: string; email: string; repName: string; businessNo: string
  phone: string; address: string; bankAccount: string | null
  bankName: string | null; tradeRegNo: string | null
  plan: string; createdAt: string; status: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankName, setBankName] = useState('')
  const [tradeRegNo, setTradeRegNo] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    fetch('/api/seller/me')
      .then(r => r.json())
      .then((data: SellerProfile) => {
        setProfile(data)
        setPhone(data.phone ?? '')
        setAddress(data.address ?? '')
        setBankAccount(data.bankAccount ?? '')
        setBankName(data.bankName ?? '')
        setTradeRegNo(data.tradeRegNo ?? '')
      })
  }, [])

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch('/api/seller/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, address, bankAccount, bankName, tradeRegNo }),
      })
      if (!res.ok) throw new Error('저장 실패')
      setSaveMsg('저장되었습니다.')
    } catch {
      setSaveMsg('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange() {
    if (newPw !== confirmPw) { setPwMsg('비밀번호가 일치하지 않습니다.'); return }
    setChangingPw(true); setPwMsg('')
    try {
      const res = await fetch('/api/seller/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '변경 실패')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPwMsg('비밀번호가 변경되었습니다.')
    } catch (e: unknown) {
      setPwMsg(e instanceof Error ? e.message : '변경에 실패했습니다.')
    } finally {
      setChangingPw(false)
    }
  }

  if (!profile) return <div className="p-8 text-muted-foreground">로딩 중...</div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">설정</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader><CardTitle>기본 정보</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {/* 각 항목: 라벨 + 값 (읽기 전용) */}
            {[
              ['상호명', profile.name],
              ['이메일', profile.email],
              ['대표자명', profile.repName],
              ['사업자번호', profile.businessNo],
              ['플랜', profile.plan],
              ['가입일', new Date(profile.createdAt).toLocaleDateString('ko-KR')],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        {/* 연락처/계좌 수정 카드 */}
        <Card>
          <CardHeader><CardTitle>연락처 / 정산 계좌</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>연락처</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
            </div>
            <div className="space-y-1">
              <Label>주소</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>은행명</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="국민은행" />
            </div>
            <div className="space-y-1">
              <Label>계좌번호</Label>
              <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="123456789012" />
            </div>
            <div className="space-y-1">
              <Label>통신판매업신고번호</Label>
              <Input value={tradeRegNo} onChange={e => setTradeRegNo(e.target.value)} placeholder="2024-서울강남-1234" />
            </div>
            {saveMsg && <p className={`text-sm ${saveMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</p>}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? '저장 중...' : '저장'}
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* 비밀번호 변경 카드 */}
      <Card>
        <CardHeader><CardTitle>비밀번호 변경</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label>현재 비밀번호</Label>
            <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>새 비밀번호 (8자 이상)</Label>
            <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>새 비밀번호 확인</Label>
            <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.includes('실패') || pwMsg.includes('않') || pwMsg.includes('올바') ? 'text-red-500' : 'text-green-600'}`}>{pwMsg}</p>}
          <Button onClick={handlePasswordChange} disabled={changingPw || !currentPw || !newPw || !confirmPw} variant="outline">
            {changingPw ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

**완료 조건:**
- [x] `/seller/settings` — 페이지 렌더링, 404 해소
- [x] 기본 정보 카드 (읽기 전용 6개 항목)
- [x] 연락처/계좌 수정 폼 5개 필드 → PATCH 저장 성공/실패 메시지
- [x] 비밀번호 변경 폼 → POST 결과 메시지

---

#### 45D: 회원가입 이용약관 동의 체크박스 추가

**파일 수정:** `app/seller/auth/register/page.tsx`

**먼저 파일 확인:**
```bash
grep -n "disabled\|handleSubmit\|onSubmit" /Users/a1111/eddy-agent/liveorder/app/seller/auth/register/page.tsx | head -10
```

**약관 페이지 존재 여부 확인:**
```bash
ls /Users/a1111/eddy-agent/liveorder/app/\(buyer\)/terms/ 2>/dev/null
ls /Users/a1111/eddy-agent/liveorder/app/seller-terms/ 2>/dev/null
```

**state 추가 (기존 useState 근처):**
```typescript
const [termsAgreed, setTermsAgreed] = useState(false)
const [sellerTermsAgreed, setSellerTermsAgreed] = useState(false)
```

**폼 제출 버튼 바로 위에 추가:**
```tsx
<div className="rounded-md border p-4 space-y-2 bg-muted/40">
  <p className="text-sm font-medium text-foreground">이용 약관 동의</p>
  <label className="flex items-start gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={termsAgreed}
      onChange={e => setTermsAgreed(e.target.checked)}
      className="mt-0.5 h-4 w-4"
    />
    <span className="text-sm">
      <a href="/terms" target="_blank" className="underline text-primary">이용약관</a>에 동의합니다 <span className="text-destructive">(필수)</span>
    </span>
  </label>
  <label className="flex items-start gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={sellerTermsAgreed}
      onChange={e => setSellerTermsAgreed(e.target.checked)}
      className="mt-0.5 h-4 w-4"
    />
    <span className="text-sm">
      <a href="/seller-terms" target="_blank" className="underline text-primary">판매자 이용약관</a>에 동의합니다 <span className="text-destructive">(필수)</span>
    </span>
  </label>
</div>
```

**제출 버튼 disabled 조건에 추가:**
```typescript
// 기존에 disabled={loading || ...} 형태일 것
disabled={loading || !termsAgreed || !sellerTermsAgreed}
```

**`/seller-terms` 페이지 없으면 생성:**
- 파일: `app/(buyer)/seller-terms/page.tsx` (또는 적절한 경로)
- 내용: `Requirements/LIVEORDER_판매자약관.md`를 정적으로 렌더링 (간단히 `<pre>` 또는 prose 스타일)

**완료 조건:**
- [x] 회원가입 폼에 이용약관 + 판매자약관 체크박스 추가
- [x] 두 항목 모두 체크 안 하면 제출 버튼 비활성화
- [x] `/terms` 및 `/seller-terms` 링크 클릭 시 새 탭에서 약관 내용 표시

---

### Task 45 전체 완료 조건 ✅ (2026-04-09)

- [x] `app/api/seller/me/route.ts` — GET 필드 확장 + PATCH 추가 (45A)
- [x] `app/api/seller/me/password/route.ts` — 비밀번호 변경 API 신규 (45B)
- [x] `app/seller/settings/page.tsx` — 설정 페이지 신규 생성 (45C)
- [x] `app/seller/auth/register/page.tsx` — 약관 동의 체크박스 추가 (45D)
- [x] git commit + push (7a4e1ae)

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
| Task 46 | 셀러 주문 상세 페이지 (/seller/orders/[id]), 주문 상세 API, 주문 검색 (구매자명/전화번호), 목록 행 클릭 → 상세 이동 | 2026-04-09 |
| Task 45 | 셀러 설정 페이지 (/seller/settings), 비밀번호 변경 API, GET/PATCH /api/seller/me 확장, 회원가입 이용약관 체크박스 + /seller-terms 약관 페이지 | 2026-04-09 |
| Task 44 | 셀러 주문 30초 자동갱신, PAID 배지 API+SellerShell 폴링, 대시보드 주별/월별 차트 | 2026-04-09 |
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
