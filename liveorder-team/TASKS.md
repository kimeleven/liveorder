# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-10 (Task 62 완료 확인 + Task 63 스펙 수립: 셀러 이용약관 전자서명 동의 완성)_

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

### ✅ Task 63: 셀러 이용약관 전자서명 동의 완성 (완료 — Dev1, commit 382643d)

**목표:** 셀러 회원가입 시 이용약관 동의 여부를 DB에 기록하고, 판매자 이용약관 페이지를 생성하며, 관리자가 셀러 약관 동의 날짜를 확인할 수 있도록 한다.

**배경:**
- 회원가입 폼에 약관 동의 체크박스는 있지만, API가 동의 여부를 DB에 저장하지 않음
- 체크박스가 링크하는 `/seller-terms` 페이지가 없어 404 발생
- 기획서 3.1.1절 "셀러 이용약관 전자서명 동의" 미완성 상태

---

#### 63A: Prisma 스키마 변경 + Migration

**수정 파일:** `prisma/schema.prisma`

`Seller` 모델에 `termsAgreedAt` 추가:

```prisma
model Seller {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique @db.VarChar(100)
  password     String   @db.VarChar(255)
  businessNo   String   @unique @map("business_no") @db.VarChar(12)
  name         String   @db.VarChar(100)
  repName      String   @map("rep_name") @db.VarChar(50)
  address      String
  phone        String   @db.VarChar(20)
  bankAccount  String?  @map("bank_account") @db.VarChar(30)
  bankName     String?  @map("bank_name") @db.VarChar(20)
  tradeRegNo         String?  @map("trade_reg_no") @db.VarChar(50)
  bizRegImageUrl     String?  @map("biz_reg_image_url")
  termsAgreedAt      DateTime? @map("terms_agreed_at") @db.Timestamptz  // ← 추가
  emailVerified      Boolean  @default(false) @map("email_verified")
  emailVerifyToken          String?   @map("email_verify_token") @db.VarChar(100)
  emailVerifyTokenExpiresAt DateTime? @map("email_verify_token_expires_at") @db.Timestamptz
  status       SellerStatus @default(PENDING)
  plan         SellerPlan   @default(FREE)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  ...
}
```

Migration 실행:
```bash
npx prisma migrate dev --name add_terms_agreed_at_to_sellers
```

**완료 조건:**
- [ ] `prisma/schema.prisma`에 `termsAgreedAt DateTime? @map("terms_agreed_at") @db.Timestamptz` 추가
- [ ] migration 파일 생성 완료 (`prisma/migrations/...add_terms_agreed_at_to_sellers/`)
- [ ] `npx prisma generate` 실행 완료

---

#### 63B: `POST /api/sellers/register` — termsAgreedAt 저장

**수정 파일:** `app/api/sellers/register/route.ts`

현재 API는 `termsAgreed` 파라미터를 무시함. 서버 측 검증 + DB 저장 추가:

```typescript
// body 파싱 부분에 termsAgreed 추가
const {
  email, password, businessNo, name, repName,
  address, phone, bankAccount, bankName, tradeRegNo,
  bizRegImageUrl,
  termsAgreed,   // ← 추가
} = await req.json()

// 서버 측 검증 (기존 검증 블록 이후)
if (!termsAgreed) {
  return NextResponse.json(
    { error: '이용약관 동의가 필요합니다.' },
    { status: 400 }
  )
}

// prisma.seller.create 데이터에 추가
await prisma.seller.create({
  data: {
    email,
    password: hashed,
    businessNo,
    name,
    repName,
    address,
    phone,
    bankAccount: bankAccount || null,
    bankName: bankName || null,
    tradeRegNo: tradeRegNo || null,
    bizRegImageUrl: bizRegImageUrl || null,
    termsAgreedAt: new Date(),   // ← 추가
    emailVerifyToken: token,
    emailVerifyTokenExpiresAt: expiresAt,
  },
})
```

**완료 조건:**
- [ ] `termsAgreed`가 `false` 또는 누락 시 400 반환
- [ ] `termsAgreed: true` 시 `termsAgreedAt: new Date()` DB 저장
- [ ] 기존 이메일/사업자번호 중복 검증, 이메일 발송 로직 영향 없음

---

#### 63C: `/seller-terms` 판매자 이용약관 페이지 신규

**신규 파일:** `app/seller-terms/page.tsx`

정적 서버 컴포넌트. 판매자 이용약관 내용 포함:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '판매자 이용약관 — LiveOrder',
}

export default function SellerTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">LiveOrder 판매자 이용약관</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제1조 (목적)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          본 약관은 LiveOrder(이하 "회사")가 제공하는 라이브 커머스 주문 중개 서비스(이하 "서비스")를
          이용하는 판매자 회원(이하 "판매자")과 회사 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제2조 (서비스 정의)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          회사는 판매자가 라이브 방송 중 구매자에게 주문 코드를 제공하고, 구매자가 해당 코드로 상품을
          주문·결제할 수 있는 중개 플랫폼을 운영합니다. 회사는 통신판매중개업자로서 판매자와 구매자 간
          거래에 직접 개입하지 않습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제3조 (판매자 의무)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          <li>판매자는 사실에 근거한 상품 정보를 등록해야 합니다.</li>
          <li>판매자는 주문 접수 후 합리적인 기간 내 배송을 처리해야 합니다.</li>
          <li>판매자는 구매자의 정당한 청약 철회 요청에 응해야 합니다.</li>
          <li>판매자는 관련 법령(전자상거래법, 소비자보호법 등)을 준수해야 합니다.</li>
          <li>불법·허위 상품 등록 시 서비스 이용이 즉시 정지될 수 있습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제4조 (수수료 및 정산)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          회사는 결제 완료된 주문 금액에서 플랫폼 이용 수수료를 공제한 후 주문일로부터 3영업일 이내에
          판매자가 등록한 계좌로 정산합니다. 수수료율은 서비스 내 정책 페이지에서 확인할 수 있으며,
          변경 시 7일 전 판매자에게 이메일로 공지합니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제5조 (금지 행위)</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          <li>허위 또는 과장 광고</li>
          <li>미성년자 대상 유해 상품 판매</li>
          <li>위조·불량 상품 판매</li>
          <li>개인정보 무단 수집 또는 남용</li>
          <li>시스템 해킹, 크롤링 등 정상 운영 방해 행위</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제6조 (계약 해지)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          판매자는 언제든지 회사에 탈퇴를 요청할 수 있습니다. 단, 진행 중인 주문·정산이 완료된 후
          탈퇴가 처리됩니다. 회사는 제5조 위반 또는 서비스 약관 위반 시 별도 고지 없이 계정을
          정지하거나 해지할 수 있습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">제7조 (면책조항)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          회사는 통신판매중개업자로서 판매자와 구매자 간의 거래에서 발생하는 분쟁에 대해 직접적인
          책임을 지지 않습니다. 단, 회사의 귀책사유로 인한 손해는 관련 법령에 따라 처리합니다.
        </p>
      </section>

      <p className="text-xs text-muted-foreground mt-8 border-t pt-4">
        시행일: 2026년 4월 10일
      </p>
    </div>
  )
}
```

**완료 조건:**
- [ ] `/seller-terms` 접속 시 404 없이 정상 렌더링
- [ ] 이용약관 7개 조항 포함
- [ ] `metadata.title` 설정
- [ ] `'use client'` 없음 (서버 컴포넌트)

---

#### 63D: 관리자 셀러 상세 페이지 — 약관 동의 날짜 표시

**수정 파일:** `app/admin/sellers/[id]/page.tsx`

현재 셀러 상세 페이지의 "기본 정보" 섹션에 약관 동의 날짜 항목 추가:

```tsx
{/* 기본 정보 테이블 내 기존 필드들 아래에 추가 */}
<tr>
  <td className="font-medium text-muted-foreground pr-4 py-1 whitespace-nowrap">약관 동의</td>
  <td className="py-1">
    {seller.termsAgreedAt ? (
      new Date(seller.termsAgreedAt).toLocaleString('ko-KR')
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
        미동의
      </span>
    )}
  </td>
</tr>
```

**`GET /api/admin/sellers/[id]` 응답에 `termsAgreedAt` 포함 확인:**

```typescript
// app/api/admin/sellers/[id]/route.ts
// select 또는 findUnique에 termsAgreedAt 추가 (없으면 추가)
const seller = await prisma.seller.findUnique({
  where: { id },
  select: {
    ...
    termsAgreedAt: true,  // ← 확인 후 없으면 추가
    ...
  },
})
```

**완료 조건:**
- [ ] `termsAgreedAt` 있으면 날짜+시각 표시
- [ ] `termsAgreedAt` 없으면 "미동의" 오렌지 배지 표시
- [ ] API 응답에 `termsAgreedAt` 포함

---

**구현 순서:** 63A (migration) → 63B (API 저장) → 63C (약관 페이지) → 63D (관리자 표시)

**주의사항:**
- 63A: `nullable` 필드이므로 기존 셀러 데이터에 영향 없음 (기존 셀러는 `termsAgreedAt: null`)
- 63B: registration API의 기존 로직(이메일 중복, 사업자번호 중복, 이메일 발송) 영향 없게 `termsAgreed` 검증만 추가
- 63C: 기존 회원가입 폼의 체크박스 링크 `href="/seller-terms"` 가 이미 설정되어 있음 — 페이지만 생성하면 됨
- 63D: API route의 select에 `termsAgreedAt`이 없으면 반드시 추가 (prisma select 누락 시 undefined 반환)

---

### ✅ Task 62: 관리자 주문 검색 + 날짜 범위 필터 + CSV 내보내기 (완료 — Dev1)

**목표:** 관리자 주문 목록에 구매자 이름/전화번호 검색, 날짜 범위 필터, CSV 내보내기를 추가하여 Tasks 60·61과 동일한 수준의 관리 도구를 완성한다.

**배경:**
- 현재 `GET /api/admin/orders`는 상태 필터 + 페이지네이션은 있지만, 검색(구매자명/전화번호) 없음
- 날짜 범위 필터 없음 — 특정 기간 주문만 조회 불가 (배송 처리·정산 기간 확인에 불편)
- CSV 내보내기 없음 — 관리자가 주문 내역을 회계/분석용으로 추출하려면 수동 복사 필요
- 전체 일관성: 관리자 정산(Task 60), 관리자 셀러(Task 61)는 이미 검색+날짜+CSV 완비

---

#### 62A: `GET /api/admin/orders` — 검색 + 날짜 범위 필터 추가

**수정 파일:** `app/api/admin/orders/route.ts`

현재 `?status=`, `?page=`, `?limit=`만 지원. 아래 파라미터를 추가:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OrderStatus } from '@prisma/client'
import { parsePagination, buildPaginationResponse } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const q = searchParams.get('q')?.trim() ?? ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const { page, limit, skip } = parsePagination(searchParams)

  const validStatuses = ['PAID', 'SHIPPING', 'DELIVERED', 'SETTLED', 'REFUNDED']
  const statusFilter = statusParam && validStatuses.includes(statusParam)
    ? { status: statusParam as OrderStatus }
    : {}

  const searchFilter = q ? {
    OR: [
      { buyerName: { contains: q, mode: 'insensitive' as const } },
      { buyerPhone: { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}

  const dateFilter = (from || to) ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    },
  } : {}

  const where = { ...statusFilter, ...searchFilter, ...dateFilter }

  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        code: {
          include: {
            product: {
              select: { name: true, seller: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return NextResponse.json(buildPaginationResponse(data, total, page, limit))
}
```

**완료 조건:**
- [ ] `?q=검색어` — buyerName 또는 buyerPhone 포함 검색 (대소문자 무시)
- [ ] `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD` 날짜 범위 (createdAt 기준)
- [ ] 기존 `?status=`, `?page=`, `?limit=` 동작 유지
- [ ] 응답 형식 `{ data, pagination }` 유지 (이미 buildPaginationResponse 적용됨)

---

#### 62B: `GET /api/admin/orders/export` — CSV 내보내기 API 신규

**신규 파일:** `app/api/admin/orders/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OrderStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const q = searchParams.get('q')?.trim() ?? ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const validStatuses = ['PAID', 'SHIPPING', 'DELIVERED', 'SETTLED', 'REFUNDED']
  const statusFilter = statusParam && validStatuses.includes(statusParam)
    ? { status: statusParam as OrderStatus }
    : {}

  const searchFilter = q ? {
    OR: [
      { buyerName: { contains: q, mode: 'insensitive' as const } },
      { buyerPhone: { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}

  const dateFilter = (from || to) ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    },
  } : {}

  const where = { ...statusFilter, ...searchFilter, ...dateFilter }

  const orders = await prisma.order.findMany({
    where,
    include: {
      code: {
        include: {
          product: {
            select: { name: true, seller: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const statusLabel: Record<string, string> = {
    PAID: '결제완료', SHIPPING: '배송중', DELIVERED: '배송완료',
    SETTLED: '정산완료', REFUNDED: '환불',
  }

  const header = '주문ID,셀러,상품명,구매자,연락처,배송지,수량,금액,상태,주문일시\n'
  const rows = orders
    .map((o) =>
      [
        o.id,
        o.code.product.seller.name,
        o.code.product.name,
        o.buyerName,
        o.buyerPhone,
        `${o.shippingAddress} ${o.shippingAddressDetail ?? ''}`.trim(),
        o.quantity,
        o.amount,
        statusLabel[o.status] ?? o.status,
        new Date(o.createdAt).toLocaleString('ko-KR'),
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  const fromPart = from ?? 'all'
  const toPart = to ?? new Date().toISOString().slice(0, 10)
  const filename = `orders_${fromPart}_${toPart}.csv`

  return new NextResponse('\uFEFF' + header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

**완료 조건:**
- [ ] 62A와 동일한 필터 파라미터 (`?status=`, `?q=`, `?from=`, `?to=`)
- [ ] UTF-8 BOM 포함
- [ ] 컬럼: 주문ID, 셀러, 상품명, 구매자, 연락처, 배송지, 수량, 금액, 상태, 주문일시
- [ ] take:10000 상한
- [ ] 파일명: `orders_{from}_{to}.csv`

---

#### 62C: `/admin/orders` 페이지 — 검색창 + 날짜 필터 + CSV 버튼 추가

**수정 파일:** `app/admin/orders/page.tsx`

**레이아웃 변경:**
```
/admin/orders
┌──────────────────────────────────────────────────────────┐
│ 주문 관리                              [CSV 내보내기]      │
│                                                           │
│ [🔍 구매자명/전화번호 검색...]          (300ms 디바운스)  │
│ [시작일: ____-__-__]  [종료일: ____-__-__]  [초기화]      │  ← 신규
│ [전체 ▼ 상태 Select]   (기존 Select 유지)                 │
│                                                           │
│ (기존 주문 테이블)                                         │
│                                                           │
│ ← 이전   1 / N 페이지  (총 N건)   다음 →                  │
└──────────────────────────────────────────────────────────┘
```

**추가 상태:**
```typescript
const [search, setSearch] = useState('')
const [searchInput, setSearchInput] = useState('')
const [fromDate, setFromDate] = useState('')
const [toDate, setToDate] = useState('')
```

**검색 디바운스 (300ms):**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setSearch(searchInput)
    setPage(1)
  }, 300)
  return () => clearTimeout(timer)
}, [searchInput])
```

**fetchOrders URL 파라미터 확장:**
```typescript
const params = new URLSearchParams({ page: String(page) })
if (statusFilter !== 'ALL') params.set('status', statusFilter)
if (search) params.set('q', search)
if (fromDate) params.set('from', fromDate)
if (toDate) params.set('to', toDate)
```

**handleExport 추가:**
```typescript
function handleExport() {
  const params = new URLSearchParams()
  if (statusFilter !== 'ALL') params.set('status', statusFilter)
  if (search) params.set('q', search)
  if (fromDate) params.set('from', fromDate)
  if (toDate) params.set('to', toDate)
  window.location.href = `/api/admin/orders/export?${params}`
}
```

**UI 추가 (기존 Select 위에):**
```tsx
{/* 검색창 */}
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="구매자명 또는 전화번호 검색..."
    className="pl-9"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
</div>

{/* 날짜 필터 */}
<div className="flex items-center gap-2">
  <input
    type="date"
    className="border rounded px-2 py-1 text-sm"
    value={fromDate}
    onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
  />
  <span className="text-muted-foreground text-sm">~</span>
  <input
    type="date"
    className="border rounded px-2 py-1 text-sm"
    value={toDate}
    onChange={(e) => { setToDate(e.target.value); setPage(1) }}
  />
  {(fromDate || toDate) && (
    <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); setPage(1) }}>
      초기화
    </Button>
  )}
</div>
```

**헤더 CSV 버튼:**
```tsx
<Button variant="outline" size="sm" onClick={handleExport}>
  <Download className="h-4 w-4 mr-1" />
  CSV 내보내기
</Button>
```

**import 추가:**
```typescript
import { Search, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
```

**완료 조건:**
- [ ] 검색창 — 구매자명/전화번호 300ms 디바운스 검색
- [ ] 날짜 범위 입력 — from/to date input + 초기화 버튼
- [ ] 상태 필터 Select 변경 시 page=1 리셋 (기존 동작 유지)
- [ ] 검색/날짜 변경 시 page=1 리셋 + 목록 재조회
- [ ] fetchOrders가 search/fromDate/toDate에도 의존하도록 useCallback deps 추가
- [ ] CSV 내보내기 버튼 — 현재 필터 조건 반영
- [ ] 기존 환불(RefundDialog) 기능 그대로 유지

---

**구현 순서:** 62A (API 수정) → 62B (export API 신규) → 62C (페이지 수정)

**주의사항:**
- 62A: 기존 `where = status && validStatuses.includes(status) ? { status } : {}` 구조를 `searchFilter`, `dateFilter` 병합으로 확장
- 62B: `export` 경로 `app/api/admin/orders/export/route.ts` — Next.js 정적 경로가 `[id]`보다 우선하므로 충돌 없음
- 62C: `fetchOrders` useCallback deps에 `search`, `fromDate`, `toDate` 추가 필수 (누락 시 필터 반영 안 됨)
- Order 모델에 `buyerPhone` 필드가 있는지 prisma 스키마 확인 필요 (실제 필드명 확인 후 적용)

---

### ✅ Task 61: 관리자 셀러 목록 고도화 — 검색 + 페이지네이션 + CSV 내보내기 (완료 — Dev1)

**목표:** 현재 전체 로드·클라이언트 필터링 방식인 관리자 셀러 목록을 서버사이드 페이지네이션 + 검색 + CSV 내보내기로 고도화한다.

**배경:**
- 현재 `GET /api/admin/sellers`는 전체 셀러를 한 번에 반환 — 셀러가 쌓이면 성능 저하
- 상태 탭 필터(PENDING/APPROVED/SUSPENDED)는 클라이언트에서만 처리 — 서버 필터링 없음
- 검색 기능 없음 — 특정 셀러(이름/이메일/사업자번호)를 빠르게 찾을 수 없음
- CSV 내보내기 없음 — 셀러 관리·감사 목적으로 목록 추출 필요 시 수동 복사

---

#### 61A: `GET /api/admin/sellers` — 페이지네이션 + 검색 + 상태 필터 추가

**수정 파일:** `app/api/admin/sellers/route.ts`

현재 `GET()`을 `GET(req: NextRequest)`로 변경, 파라미터 추가:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SellerStatus } from '@prisma/client'
import { parsePagination, buildPaginationResponse } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const q = searchParams.get('q')?.trim() ?? ''
  const { page, limit, skip } = parsePagination(searchParams)

  const statusFilter = statusParam && Object.values(SellerStatus).includes(statusParam as SellerStatus)
    ? { status: statusParam as SellerStatus }
    : {}

  const searchFilter = q ? {
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
      { businessNo: { contains: q, mode: 'insensitive' as const } },
      { repName: { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}

  const where = { ...statusFilter, ...searchFilter }

  const [total, sellers] = await Promise.all([
    prisma.seller.count({ where }),
    prisma.seller.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        repName: true,
        businessNo: true,
        phone: true,
        status: true,
        bizRegImageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return NextResponse.json(buildPaginationResponse(sellers, total, page, limit))
}
```

**완료 조건:**
- [ ] `?status=PENDING|APPROVED|SUSPENDED` 서버사이드 필터
- [ ] `?q=검색어` — 이름, 이메일, 사업자번호, 대표자명 포함 검색 (대소문자 무시)
- [ ] `?page=`, `?limit=` 페이지네이션 (기본 limit=20)
- [ ] 응답 형식: `{ data: [], pagination: { total, page, limit, totalPages } }`

---

#### 61B: `GET /api/admin/sellers/export` — CSV 내보내기 API 신규

**신규 파일:** `app/api/admin/sellers/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SellerStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const q = searchParams.get('q')?.trim() ?? ''

  const statusFilter = statusParam && Object.values(SellerStatus).includes(statusParam as SellerStatus)
    ? { status: statusParam as SellerStatus }
    : {}

  const searchFilter = q ? {
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
      { businessNo: { contains: q, mode: 'insensitive' as const } },
      { repName: { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}

  const sellers = await prisma.seller.findMany({
    where: { ...statusFilter, ...searchFilter },
    select: {
      id: true,
      email: true,
      name: true,
      repName: true,
      businessNo: true,
      phone: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const statusLabel: Record<string, string> = {
    PENDING: '승인대기',
    APPROVED: '승인완료',
    SUSPENDED: '정지',
  }

  const header = '셀러ID,상호명,대표자,이메일,사업자번호,전화번호,상태,가입일\n'
  const rows = sellers
    .map((s) =>
      [
        s.id,
        s.name,
        s.repName,
        s.email,
        s.businessNo,
        s.phone,
        statusLabel[s.status] ?? s.status,
        new Date(s.createdAt).toLocaleDateString('ko-KR'),
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  const bom = '\uFEFF'
  const csv = bom + header + rows
  const filename = `sellers_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

**완료 조건:**
- [ ] 61A와 동일한 필터 파라미터 (`?status=`, `?q=`)
- [ ] UTF-8 BOM 포함
- [ ] 컬럼: 셀러ID, 상호명, 대표자, 이메일, 사업자번호, 전화번호, 상태, 가입일
- [ ] take:10000 상한

---

#### 61C: `/admin/sellers` 페이지 — 검색창 + 페이지네이션 + CSV 버튼 추가

**수정 파일:** `app/admin/sellers/page.tsx`

**레이아웃 변경:**
```
/admin/sellers
┌──────────────────────────────────────────────────────────┐
│ 셀러 관리                              [CSV 내보내기]      │
│                                                           │
│ [🔍 이름/이메일/사업자번호 검색...]    (300ms 디바운스)   │
│ [전체] [승인대기] [승인완료] [정지]    (상태 탭 — 서버)   │
│                                                           │
│ (셀러 테이블)                                             │
│                                                           │
│ ← 이전   1 / 5 페이지  (총 N건)   다음 →                  │
└──────────────────────────────────────────────────────────┘
```

**추가 상태:**
```typescript
const [search, setSearch] = useState('')
const [searchInput, setSearchInput] = useState('')
const [page, setPage] = useState(1)
const [totalPages, setTotalPages] = useState(1)
const [total, setTotal] = useState(0)
const LIMIT = 20
```

**검색 디바운스 (300ms):**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setSearch(searchInput)
    setPage(1)
  }, 300)
  return () => clearTimeout(timer)
}, [searchInput])
```

**fetchSellers 함수:**
```typescript
async function fetchSellers(currentPage = page, currentTab = tab, currentSearch = search) {
  const params = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) })
  if (currentTab !== 'ALL') params.set('status', currentTab)
  if (currentSearch) params.set('q', currentSearch)
  const res = await fetch(`/api/admin/sellers?${params}`)
  const data = await res.json()
  if (data.data) {
    setSellers(data.data)
    setTotalPages(data.totalPages ?? 1)
    setTotal(data.total ?? 0)
  }
}
```

**handleExport:**
```typescript
function handleExport() {
  const params = new URLSearchParams()
  if (tab !== 'ALL') params.set('status', tab)
  if (search) params.set('q', search)
  window.location.href = `/api/admin/sellers/export?${params}`
}
```

**검색창 UI (탭 위에 추가):**
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="이름, 이메일, 사업자번호 검색..."
    className="pl-9"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
</div>
```

**페이지네이션 UI (테이블 아래):**
```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-between px-4 py-3 border-t">
    <p className="text-sm text-muted-foreground">총 {total}건</p>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={page === 1}
        onClick={() => { setPage(p => p - 1); fetchSellers(page - 1) }}>
        이전
      </Button>
      <span className="text-sm">{page} / {totalPages}</span>
      <Button variant="outline" size="sm" disabled={page === totalPages}
        onClick={() => { setPage(p => p + 1); fetchSellers(page + 1) }}>
        다음
      </Button>
    </div>
  </div>
)}
```

**헤더 버튼 + import 추가:**
```typescript
import { Search, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
```

```tsx
{/* 헤더 우측 */}
<Button variant="outline" size="sm" onClick={handleExport}>
  <Download className="h-4 w-4 mr-1" />
  CSV 내보내기
</Button>
```

**완료 조건:**
- [ ] 검색창 — 이름/이메일/사업자번호 300ms 디바운스
- [ ] 상태 탭 클릭 → 서버사이드 필터 + page=1 리셋
- [ ] 검색어 변경 → page=1 리셋 + 목록 재조회
- [ ] 페이지네이션 — 이전/다음 버튼 + 현재/전체 페이지 + 총 건수
- [ ] CSV 내보내기 버튼 — 현재 필터 조건 반영
- [ ] 기존 상태 변경(승인/거부/정지) 기능 그대로 유지

---

**구현 순서:** 61A (API 수정) → 61B (export API 신규) → 61C (페이지 수정)

**주의사항:**
- 61A API 응답 형식이 `[]` → `{ data, pagination }` 변경 — 61C 페이지 동시 수정 필수
- `export` 경로 충돌 없음: `app/api/admin/sellers/export/route.ts` (기존 `app/api/admin/sellers/[id]/route.ts`와 Next.js 라우팅 우선순위 충돌 주의 — `export`는 정적 경로이므로 `[id]`보다 우선)
- 기존 `PATCH /api/admin/sellers/[id]` 코드 영향 없음 (별도 파일)
- 상태 탭은 기존 `Tabs` 컴포넌트 유지 — tab 변경 핸들러에서 `fetchSellers(1, newTab)` 호출하도록 수정

---

### ✅ Task 60: 관리자 정산 페이지 개선 — 필터 + 페이지네이션 + CSV 내보내기 (완료 — Dev1)

**목표:** 관리자가 정산 내역을 날짜/상태로 필터링하고, 페이지네이션으로 대량 데이터를 탐색하며, 필터 조건 그대로 CSV로 내보낼 수 있도록 한다.

**배경:**
- 현재 `GET /api/admin/settlements`는 전체 정산을 한 번에 반환 — 데이터가 쌓이면 성능 문제
- 상태(PENDING/COMPLETED/FAILED) 탭만 있고, 날짜 범위 필터 없음
- CSV 내보내기 기능 없음 — 회계/세금 처리 시 수동 복사해야 함
- 배치 실행 후 해당 기간 결과만 확인하려면 전체 목록을 스크롤해야 함

---

#### 60A: `GET /api/admin/settlements` — 페이지네이션 + 날짜/셀러 필터 추가

**수정 파일:** `app/api/admin/settlements/route.ts`

현재 `GET()`을 `GET(req: NextRequest)`로 변경, 파라미터 추가:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SettlementStatus } from '@prisma/client'
import { parsePagination, buildPaginationResponse } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const sellerId = searchParams.get('sellerId')
  const { page, limit, skip } = parsePagination(searchParams)

  const statusFilter = statusParam && Object.values(SettlementStatus).includes(statusParam as SettlementStatus)
    ? { status: statusParam as SettlementStatus }
    : {}

  const dateFilter = (from || to) ? {
    scheduledAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    }
  } : {}

  const where = {
    ...statusFilter,
    ...dateFilter,
    ...(sellerId ? { sellerId } : {}),
  }

  const [total, settlements] = await Promise.all([
    prisma.settlement.count({ where }),
    prisma.settlement.findMany({
      where,
      include: { seller: { select: { name: true, businessNo: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ])

  return NextResponse.json(buildPaginationResponse(settlements, total, page, limit))
}
```

**완료 조건:**
- [x] `?status=PENDING|COMPLETED|FAILED` 필터 작동
- [x] `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD` 날짜 범위 (scheduledAt 기준)
- [x] `?sellerId=uuid` 특정 셀러 정산만 조회
- [x] `?page=`, `?limit=` 페이지네이션 (기본 limit=20)
- [x] 응답 형식: `{ data: [], pagination: { total, page, limit, totalPages, ... } }`
- [x] 기존 `POST` (배치 실행) 그대로 유지

---

#### 60B: `GET /api/admin/settlements/export` — CSV 내보내기 API 신규

**신규 파일:** `app/api/admin/settlements/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SettlementStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const sellerId = searchParams.get('sellerId')

  const statusFilter = statusParam && Object.values(SettlementStatus).includes(statusParam as SettlementStatus)
    ? { status: statusParam as SettlementStatus }
    : {}

  const dateFilter = (from || to) ? {
    scheduledAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    }
  } : {}

  const where = {
    ...statusFilter,
    ...dateFilter,
    ...(sellerId ? { sellerId } : {}),
  }

  const settlements = await prisma.settlement.findMany({
    where,
    include: { seller: { select: { name: true, businessNo: true, email: true } } },
    orderBy: { scheduledAt: 'desc' },
    take: 10000,
  })

  const header = '정산ID,셀러,사업자번호,거래금액,플랫폼수수료,PG수수료,실지급액,상태,정산예정일,정산완료일,생성일\n'
  const statusLabel: Record<string, string> = { PENDING: '대기', COMPLETED: '완료', FAILED: '실패' }

  const rows = settlements
    .map((s) =>
      [
        s.id,
        s.seller.name,
        s.seller.businessNo,
        s.amount,
        s.fee,
        s.pgFee,
        s.netAmount,
        statusLabel[s.status] ?? s.status,
        new Date(s.scheduledAt).toLocaleDateString('ko-KR'),
        s.settledAt ? new Date(s.settledAt).toLocaleDateString('ko-KR') : '',
        new Date(s.createdAt).toLocaleDateString('ko-KR'),
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  const bom = '\uFEFF'
  const csv = bom + header + rows
  const suffix = from && to ? `_${from}_${to}` : from ? `_from_${from}` : to ? `_to_${to}` : ''
  const filename = `settlements${suffix}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

**완료 조건:**
- [x] 60A와 동일한 필터 파라미터 지원 (`?status=`, `?from=`, `?to=`, `?sellerId=`)
- [x] UTF-8 BOM 포함
- [x] 컬럼: 정산ID, 셀러, 사업자번호, 거래금액, 플랫폼수수료, PG수수료, 실지급액, 상태, 정산예정일, 정산완료일, 생성일
- [x] 파일명에 날짜 범위 반영 (`settlements_2026-04-01_2026-04-10_2026-04-10.csv`)
- [x] take:10000 상한

---

#### 60C: `/admin/settlements` 페이지 — 날짜 필터 + 페이지네이션 + CSV 버튼 추가

**수정 파일:** `app/admin/settlements/page.tsx`

**레이아웃 변경:**
```
/admin/settlements
┌──────────────────────────────────────────────────────────┐
│ 정산 관리              [정산 배치 실행]  [CSV 내보내기 ▼] │
│                                                           │
│ [시작일: ____-__-__]  [종료일: ____-__-__]               │
│ [전체] [대기] [완료] [실패]   (상태 탭 — 기존)            │
│                                                           │
│ (정산 테이블)                                             │
│                                                           │
│ ← 이전   1 / 3 페이지   다음 →                           │
└──────────────────────────────────────────────────────────┘
```

**추가 상태:**
```typescript
const [fromDate, setFromDate] = useState('')
const [toDate, setToDate] = useState('')
const [page, setPage] = useState(1)
const [totalPages, setTotalPages] = useState(1)
const [total, setTotal] = useState(0)
const LIMIT = 20
```

**fetchSettlements 함수:**
```typescript
async function fetchSettlements(currentPage = page, currentTab = tab, currentFrom = fromDate, currentTo = toDate) {
  const params = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) })
  if (currentTab !== 'ALL') params.set('status', currentTab)
  if (currentFrom) params.set('from', currentFrom)
  if (currentTo) params.set('to', currentTo)
  const res = await fetch(`/api/admin/settlements?${params}`)
  const data = await res.json()
  if (data.data) {
    setSettlements(data.data)
    setTotalPages(data.totalPages)
    setTotal(data.total)
  }
}
```

**handleExport:**
```typescript
function handleExport() {
  const params = new URLSearchParams()
  if (tab !== 'ALL') params.set('status', tab)
  if (fromDate) params.set('from', fromDate)
  if (toDate) params.set('to', toDate)
  window.location.href = `/api/admin/settlements/export?${params}`
}
```

**날짜 필터 UI (상태 탭 위에 추가):**
```tsx
<div className="flex flex-wrap gap-2 items-center">
  <div className="flex items-center gap-1">
    <Label className="text-xs text-muted-foreground whitespace-nowrap">시작일</Label>
    <input type="date" className="border rounded px-2 py-1 text-sm"
      value={fromDate} max={toDate || undefined}
      onChange={(e) => { setFromDate(e.target.value); setPage(1); fetchSettlements(1, tab, e.target.value, toDate) }} />
  </div>
  <div className="flex items-center gap-1">
    <Label className="text-xs text-muted-foreground whitespace-nowrap">종료일</Label>
    <input type="date" className="border rounded px-2 py-1 text-sm"
      value={toDate} min={fromDate || undefined}
      onChange={(e) => { setToDate(e.target.value); setPage(1); fetchSettlements(1, tab, fromDate, e.target.value) }} />
  </div>
  {(fromDate || toDate) && (
    <Button variant="ghost" size="sm"
      onClick={() => { setFromDate(''); setToDate(''); setPage(1); fetchSettlements(1, tab, '', '') }}>
      초기화
    </Button>
  )}
</div>
```

**페이지네이션 UI (테이블 아래):**
```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-between px-4 py-3 border-t">
    <p className="text-sm text-muted-foreground">총 {total}건</p>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={page === 1}
        onClick={() => { setPage(p => p - 1); fetchSettlements(page - 1) }}>
        이전
      </Button>
      <span className="text-sm">{page} / {totalPages}</span>
      <Button variant="outline" size="sm" disabled={page === totalPages}
        onClick={() => { setPage(p => p + 1); fetchSettlements(page + 1) }}>
        다음
      </Button>
    </div>
  </div>
)}
```

**헤더 버튼 영역 수정:**
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" onClick={handleExport}>
    <Download className="h-4 w-4 mr-1" />
    {(tab !== 'ALL' || fromDate || toDate) ? '필터 조건으로 CSV' : 'CSV 내보내기'}
  </Button>
  <Button onClick={runSettlementBatch} disabled={batchLoading}>
    {batchLoading ? '처리 중...' : '정산 배치 실행'}
  </Button>
</div>
```

**완료 조건:**
- [x] 날짜 범위 필터 — 시작일/종료일 input, 변경 시 page=1 리셋 + 목록 재조회
- [x] 상태 탭 클릭 시 page=1 리셋 (기존 탭 기능 유지)
- [x] 페이지네이션 — 이전/다음 버튼 + 현재/전체 페이지 표시 + 총 건수
- [x] "CSV 내보내기" 버튼 — 현재 필터 조건 그대로 export URL에 전달
- [x] 필터 있을 때 버튼 텍스트 "필터 조건으로 CSV"
- [x] `Download` 아이콘 import (lucide-react)
- [x] 기존 배치 실행 버튼 + 결과 배너 유지

---

**구현 순서:** 60A (API 수정) → 60B (export API 신규) → 60C (페이지 수정)

**주의사항:**
- `parsePagination`, `buildPaginationResponse`는 `lib/pagination.ts`에 이미 구현 — 동일하게 사용
- 60A API 변경으로 응답 형식이 `[]` → `{ data, total, page, limit, totalPages }`로 바뀜 — 60C 페이지도 동시에 수정 필요
- 기존 `POST /api/admin/settlements` (배치 실행) 코드는 GET 함수와 같은 파일에 있음 — POST 그대로 유지
- 날짜 필터는 `scheduledAt` 기준 (정산 예정일) — 셀러 라이브 방송 기준 정산 조회에 적합
- `export` 폴더는 `[id]` 폴더와 달리 동적 파라미터 없으므로 충돌 없음 (`app/api/admin/settlements/export/route.ts`)

---

### ✅ Task 59: 셀러 주문 목록 날짜 범위 필터 + 상품 필터 + 전체 CSV 필터링 (완료 — commit d715a77)

**목표:** 셀러가 주문 목록에서 날짜 범위(방송 날짜)와 상품으로 필터링하고, 해당 조건 그대로 CSV를 내보낼 수 있도록 한다.

**배경:**
- 셀러가 특정 날짜에 진행한 라이브 방송의 주문만 추려 배송지를 준비하고 싶을 때 현재 방법 없음
- 여러 상품을 판매하는 셀러가 특정 상품 주문만 볼 수 없음
- 현재 `GET /api/seller/orders/export`는 전체 주문 내보내기만 지원 — 현재 필터 조건 반영 안 됨
- 현재 `GET /api/seller/orders/export`는 상태 필터, 날짜 필터, 상품 필터 미지원

---

#### 59A: `GET /api/seller/orders` — `?from=`, `?to=`, `?productId=` 파라미터 추가

**수정 파일:** `app/api/seller/orders/route.ts`

현재 `where` 구성에 날짜/상품 필터 추가:

```typescript
const from = searchParams.get('from')       // "2026-04-01" 형식
const to = searchParams.get('to')           // "2026-04-10" 형식
const productId = searchParams.get('productId')

const dateFilter = (from || to) ? {
  createdAt: {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
  }
} : {}

// 기존 where의 code.product 조건에 productId 병합
const where = {
  code: {
    product: {
      sellerId: session.user.id,
      ...(productId ? { id: productId } : {}),
    },
  },
  ...statusFilter,
  ...dateFilter,
  ...(q ? {
    OR: [
      { buyerName: { contains: q, mode: 'insensitive' as const } },
      { buyerPhone: { contains: q } },
    ]
  } : {}),
}
```

**완료 조건:**
- [x] `?from=2026-04-01` → 해당 날짜 00:00:00 이후 주문만 반환
- [x] `?to=2026-04-10` → 해당 날짜 23:59:59 이전 주문만 반환
- [x] `?from=&?to=` 동시 사용 가능 (날짜 범위)
- [x] `?productId={uuid}` → 해당 상품 코드로 접수된 주문만 반환
- [x] `?productId=` 미설정 시 기존 동작 유지 (전체 상품)
- [x] 기존 `?status=`, `?q=` 파라미터 동작 유지
- [x] 셀러 소유 검증 유지 (다른 셀러 상품 주문 노출 불가)

---

#### 59B: `GET /api/seller/orders/export` — 날짜/상품/상태/검색 필터 지원

**수정 파일:** `app/api/seller/orders/export/route.ts`

현재 `GET()` → `GET(req: NextRequest)`로 변경 후 59A와 동일한 필터 로직 적용:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OrderStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const statusFilter = statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)
    ? { status: statusParam as OrderStatus }
    : {}
  const q = searchParams.get('q')?.trim() ?? ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const productId = searchParams.get('productId')

  const dateFilter = (from || to) ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    }
  } : {}

  const where = {
    code: {
      product: {
        sellerId: session.user.id,
        ...(productId ? { id: productId } : {}),
      },
    },
    ...statusFilter,
    ...dateFilter,
    ...(q ? {
      OR: [
        { buyerName: { contains: q, mode: 'insensitive' as const } },
        { buyerPhone: { contains: q } },
      ]
    } : {}),
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      code: { select: { codeKey: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const header = '주문ID,주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로\n'
  const rows = orders
    .map((o) =>
      [
        o.id,
        new Date(o.createdAt).toLocaleString('ko-KR'),
        o.code.product.name,
        o.code.codeKey,
        o.buyerName,
        o.buyerPhone,
        o.address,
        o.addressDetail ?? '',
        o.memo ?? '',
        o.quantity,
        o.amount,
        o.status,
        o.trackingNo ?? '',
        o.source === 'kakao' ? '카카오' : '웹',
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  const bom = '\uFEFF'
  const csv = bom + header + rows
  // 파일명에 날짜 범위 반영
  const suffix = from && to ? `_${from}_${to}` : from ? `_from_${from}` : to ? `_to_${to}` : ''
  const filename = `orders${suffix}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

**완료 조건:**
- [x] 59A와 동일한 필터 파라미터(`?from=`, `?to=`, `?productId=`, `?status=`, `?q=`) 지원
- [x] 파일명에 날짜 범위 반영 — 예: `orders_2026-04-01_2026-04-10_2026-04-10.csv`
- [x] 필터 없으면 기존과 동일 (`orders_2026-04-10.csv`)
- [x] UTF-8 BOM 유지, take:10000 상한 유지

---

#### 59C: `/seller/orders` — 날짜 범위 입력 + 상품 선택 드롭다운 추가

**수정 파일:** `app/seller/orders/page.tsx`

**추가 상태:**
```typescript
const [fromDate, setFromDate] = useState('')   // "YYYY-MM-DD" 형식
const [toDate, setToDate] = useState('')
const [productId, setProductId] = useState('')
const [products, setProducts] = useState<{ id: string; name: string }[]>([])
```

**상품 목록 로드 (마운트 시 1회):**
```typescript
useEffect(() => {
  fetch('/api/seller/products?status=all&limit=100')
    .then(r => r.json())
    .then(res => { if (res.data) setProducts(res.data) })
    .catch(() => {})
}, [])
```

**fetchOrders 시그니처 확장:**
```typescript
async function fetchOrders(
  currentPage = page,
  currentStatus = statusFilter,
  currentQuery = searchQuery,
  currentFrom = fromDate,
  currentTo = toDate,
  currentProductId = productId,
) {
  const params = new URLSearchParams({ page: String(currentPage), limit: '20' })
  if (currentStatus) params.set('status', currentStatus)
  if (currentQuery) params.set('q', currentQuery)
  if (currentFrom) params.set('from', currentFrom)
  if (currentTo) params.set('to', currentTo)
  if (currentProductId) params.set('productId', currentProductId)
  // ... 기존 fetch 로직
}
```

**useEffect 의존성 추가:**
```typescript
useEffect(() => {
  fetchOrders(page, statusFilter, searchQuery, fromDate, toDate, productId)
}, [page, statusFilter, searchQuery, fromDate, toDate, productId])
```

**UI — 기존 검색창 + 상태 필터 위에 날짜/상품 필터 행 추가:**
```tsx
{/* 날짜 범위 + 상품 필터 */}
<div className="flex flex-wrap gap-2 items-center">
  <div className="flex items-center gap-1">
    <Label className="text-xs text-muted-foreground whitespace-nowrap">시작일</Label>
    <input
      type="date"
      className="border rounded px-2 py-1 text-sm"
      value={fromDate}
      max={toDate || undefined}
      onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
    />
  </div>
  <div className="flex items-center gap-1">
    <Label className="text-xs text-muted-foreground whitespace-nowrap">종료일</Label>
    <input
      type="date"
      className="border rounded px-2 py-1 text-sm"
      value={toDate}
      min={fromDate || undefined}
      onChange={(e) => { setToDate(e.target.value); setPage(1) }}
    />
  </div>
  <Select value={productId} onValueChange={(v) => { setProductId(v === '_all' ? '' : v); setPage(1) }}>
    <SelectTrigger className="w-[180px] text-sm">
      <SelectValue placeholder="전체 상품" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="_all">전체 상품</SelectItem>
      {products.map(p => (
        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  {(fromDate || toDate || productId) && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => { setFromDate(''); setToDate(''); setProductId(''); setPage(1) }}
    >
      필터 초기화
    </Button>
  )}
</div>
```

**완료 조건:**
- [x] 시작일/종료일 date 입력 — 변경 시 page=1 리셋 + 목록 재조회
- [x] 상품 드롭다운 — 셀러 상품 목록 (status=all) 로드, "전체 상품" 기본값
- [x] "필터 초기화" 버튼 — 날짜/상품 필터 중 하나라도 설정 시 표시
- [x] 시작일 max = 종료일, 종료일 min = 시작일 (논리 오류 방지)
- [x] 30초 자동갱신 useEffect도 fromDate/toDate/productId 의존성 반영

---

#### 59D: `/seller/orders` — "CSV 다운로드" 버튼에 현재 필터 반영

**수정 파일:** `app/seller/orders/page.tsx`

현재 CSV 다운로드 핸들러에서 현재 필터 파라미터를 export URL에 추가:

```typescript
async function handleExport() {
  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (searchQuery) params.set('q', searchQuery)
  if (fromDate) params.set('from', fromDate)
  if (toDate) params.set('to', toDate)
  if (productId) params.set('productId', productId)
  window.location.href = `/api/seller/orders/export?${params.toString()}`
}
```

버튼 텍스트:
- 필터 있으면: "필터 조건으로 CSV 내보내기"
- 필터 없으면: "전체 주문 CSV 다운로드"

```tsx
<Button variant="outline" size="sm" onClick={handleExport}>
  <Download className="h-4 w-4 mr-1" />
  {(statusFilter || searchQuery || fromDate || toDate || productId)
    ? '필터 조건으로 CSV 내보내기'
    : '전체 주문 CSV 다운로드'}
</Button>
```

**완료 조건:**
- [x] CSV 다운로드 시 현재 상태/검색어/날짜/상품 필터 모두 export URL에 전달
- [x] 필터 있을 때 버튼 텍스트 "필터 조건으로 CSV 내보내기"로 변경
- [x] 파일명에 날짜 범위 반영됨 (59B에서 처리)

---

**구현 순서:** 59A (API 확장) → 59B (export API 확장) → 59C (날짜/상품 UI) → 59D (CSV 버튼 연결)

**주의사항:**
- `products` 상태 로드 시 `/api/seller/products?status=all&limit=100` 사용 — 비활성 상품 주문도 볼 수 있어야 하므로 `status=all`
- `date` input은 shadcn DatePicker 없이 네이티브 `<input type="date">` 사용 — 추가 패키지 불필요
- `fromDate` / `toDate` 상태 변경 시 30초 자동갱신 useEffect도 같이 업데이트 필요 — 의존성 배열에 추가
- 기존 `fetchOrders` 함수 시그니처가 `(currentPage, currentStatus, currentQuery)` 3개 파라미터 — 59C에서 6개로 확장 시 하위 호환성 유지 (기본값 활용)

---

## ✅ Task 58: 셀러 코드 상세 QR 코드 표시 + 코드별 주문 CSV 다운로드 (2026-04-10 완료)

**목표:** 셀러가 `/seller/codes/[id]` 상세 페이지에서 QR 코드를 확인/다운로드하고, 해당 코드에 달린 주문만 CSV로 내려받을 수 있도록 한다.

**배경:**
- 현재 QR 코드는 코드 **생성 직후** 화면(`/seller/codes/new`)에서만 볼 수 있음 — 나중에 다시 조회 불가
- 라이브 방송 시작 전 QR 이미지가 필요한 경우, 코드 상세 페이지에서 즉시 저장할 수 없음
- 현재 CSV 내보내기(`/api/seller/orders/export`)는 셀러 전체 주문 다운로드만 지원 — 특정 코드(방송 회차)별 배송지 추출 불가

---

#### 58A: `/seller/codes/[id]` — QR 코드 섹션 추가

**수정 파일:** `app/seller/codes/[id]/page.tsx`

**import 추가:**
```typescript
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
```

**상태 추가:**
```typescript
const [qrDataUrl, setQrDataUrl] = useState('')
```

**QR 생성 (fetchData 완료 후 data가 세팅될 때 useEffect 추가):**
```typescript
useEffect(() => {
  if (!data) return
  const orderUrl = `${window.location.origin}/order/${data.code.codeKey}`
  QRCode.toDataURL(orderUrl, { width: 256, margin: 2 }).then(setQrDataUrl)
}, [data])
```

**코드 정보 카드 내 QR 섹션 추가 (기존 카드 내부, codeKey 표시 아래):**
```tsx
{qrDataUrl && (
  <div className="flex flex-col items-center gap-2 pt-2">
    <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 rounded border" />
    <a
      href={qrDataUrl}
      download={`qr-${data.code.codeKey}.png`}
      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
    >
      <Download className="h-3 w-3" />
      QR 저장
    </a>
  </div>
)}
```

**완료 조건:**
- [x] 코드 상세 페이지에 QR 코드 이미지가 표시됨 (256×256)
- [x] "QR 저장" 링크 클릭 시 `qr-{codeKey}.png` 파일로 다운로드
- [x] data가 null(로딩 중)일 때는 QR 표시 안 함 (깜빡임 없음)
- [x] `/order/{codeKey}` URL로 QR 생성 (기존 `/seller/codes/new` 패턴과 동일)

---

#### 58B: `GET /api/seller/codes/[id]/orders/export` — 코드별 주문 CSV 다운로드

**신규 파일:** `app/api/seller/codes/[id]/orders/export/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 소유 검증
  const code = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
    select: { codeKey: true },
  })
  if (!code)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const orders = await prisma.order.findMany({
    where: { codeId: id },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const header = '주문ID,주문일시,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로\n'
  const rows = orders
    .map((o) =>
      [
        o.id,
        new Date(o.createdAt).toLocaleString('ko-KR'),
        o.buyerName,
        o.buyerPhone,
        o.address,
        o.addressDetail ?? '',
        o.memo ?? '',
        o.quantity,
        o.amount,
        o.status,
        o.trackingNo ?? '',
        o.source === 'kakao' ? '카카오' : '웹',
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  const bom = '\uFEFF'
  const csv = bom + header + rows
  const filename = `orders_${code.codeKey}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

**완료 조건:**
- [x] `GET /api/seller/codes/[id]/orders/export` — 해당 코드 소유 셀러만 접근 가능
- [x] 해당 codeId 주문만 포함 (다른 코드 주문 포함 안 됨)
- [x] 파일명: `orders_{codeKey}_{날짜}.csv` (예: `orders_K9A-2503-X7YZ_2026-04-09.csv`)
- [x] UTF-8 BOM 포함, 컬럼: 주문ID/주문일시/수령인/연락처/주소/상세주소/배송메모/수량/금액/상태/운송장/주문경로
- [x] 소유 검증 실패 시 404 반환

---

#### 58C: `/seller/codes/[id]` — "주문 다운로드" 버튼 추가

**수정 파일:** `app/seller/codes/[id]/page.tsx`

**상태 추가:**
```typescript
const [exporting, setExporting] = useState(false)
```

**다운로드 핸들러:**
```typescript
async function handleExport() {
  setExporting(true)
  try {
    const res = await fetch(`/api/seller/codes/${id}/orders/export`)
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${data?.code.codeKey ?? id}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('주문 내역을 다운로드했습니다.')
  } catch {
    toast.error('다운로드에 실패했습니다.')
  } finally {
    setExporting(false)
  }
}
```

**주문 테이블 헤더 옆에 버튼 추가:**
```tsx
<div className="flex items-center justify-between">
  <CardTitle>주문 목록 ({data.stats.totalOrders}건)</CardTitle>
  <Button
    variant="outline"
    size="sm"
    onClick={handleExport}
    disabled={exporting || data.stats.totalOrders === 0}
  >
    {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
    주문 다운로드
  </Button>
</div>
```

**완료 조건:**
- [x] "주문 다운로드" 버튼 — 주문 0건이면 disabled
- [x] 클릭 시 로딩 스피너 표시, 완료 시 CSV 파일 즉시 다운로드
- [x] 성공/실패 토스트 알림
- [x] `Download` 아이콘 — lucide-react import (58A에서 이미 추가됨)

---

**구현 순서:** 58B (API 신규) → 58A (QR 추가) → 58C (다운로드 버튼)

**주의사항:**
- `qrcode` 패키지는 `/seller/codes/new/page.tsx`에서 이미 사용 중 — `import QRCode from 'qrcode'` 그대로 사용 가능
- `Download` 아이콘을 58A/58C에서 동시에 추가하므로 import 중복 금지
- `/api/seller/codes/[id]/orders/export`는 `app/api/seller/codes/[id]/` 하위 신규 디렉터리 `orders/export/route.ts`로 생성

---

## ✅ Task 57: 셀러 코드 목록 상태 필터 + 검색 (2026-04-09 완료)

**목표:** 상품 목록(`/seller/products`)과 동일한 패턴으로 코드 목록에도 상태 필터와 검색 기능 추가

**배경:**
- 현재 `/api/seller/codes`는 전체 코드(활성+만료+중지 혼합) 반환 — 상품 목록의 `?status` 필터 패턴과 불일치
- `/seller/codes` 목록에 상태 필터 탭 없음 — 만료 코드가 활성 코드와 섞여 표시됨
- 코드가 많아질수록 특정 코드를 찾기 어려움 — 코드키/상품명 검색 기능 없음

---

#### 57A: `GET /api/seller/codes` — `?status` + `?q` 파라미터 지원

**수정 파일:** `app/api/seller/codes/route.ts`

현재 `where = { product: { sellerId: session.user.id } }` 고정 → status + q 파라미터로 분기:

```typescript
const status = searchParams.get('status') ?? 'all'
const q = searchParams.get('q')?.trim() ?? ''
const now = new Date()

const statusFilter =
  status === 'active'   ? { isActive: true, expiresAt: { gt: now } } :
  status === 'expired'  ? { expiresAt: { lte: now } } :
  status === 'inactive' ? { isActive: false, expiresAt: { gt: now } } :
  {}

const searchFilter = q ? {
  OR: [
    { codeKey: { contains: q, mode: 'insensitive' as const } },
    { product: { name: { contains: q, mode: 'insensitive' as const } } },
  ]
} : {}

const where = {
  product: { sellerId: session.user.id },
  ...statusFilter,
  ...searchFilter,
}
```

**완료 조건:**
- [x] `?status=active` → isActive=true AND expiresAt > now 코드만
- [x] `?status=expired` → expiresAt <= now 코드만 (isActive 무관)
- [x] `?status=inactive` → isActive=false AND expiresAt > now 코드만
- [x] `?status=all` (또는 파라미터 없음) → 전체 코드
- [x] `?q=검색어` → codeKey 또는 product.name 포함 (대소문자 무시)
- [x] 기존 페이지네이션 (`parsePagination` + `buildPaginationResponse`) 동작 유지
- [x] `include: { product: { select: { name: true } } }` 유지

---

#### 57B: `/seller/codes` 목록 페이지 — 상태 필터 탭 + 검색창 추가

**수정 파일:** `app/seller/codes/page.tsx`

**추가 상태:**
```typescript
const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'inactive' | 'all'>('active')
const [searchInput, setSearchInput] = useState('')
const [search, setSearch] = useState('')
```

**검색 디바운스 (300ms):**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setSearch(searchInput)
    setPage(1)
  }, 300)
  return () => clearTimeout(timer)
}, [searchInput])
```

**fetch URL 수정:**
```typescript
// 기존: fetch(`/api/seller/codes?page=${page}`)
// 변경:
fetch(`/api/seller/codes?page=${page}&status=${statusFilter}&q=${encodeURIComponent(search)}`)
```

**useEffect 의존성 수정:**
```typescript
useEffect(() => {
  // fetch 로직
}, [page, statusFilter, search])
```

**검색창 + 필터 탭 UI (헤더 아래, 테이블 위에 추가):**
```tsx
{/* 검색창 */}
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="코드 또는 상품명 검색..."
    className="pl-9"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
</div>

{/* 상태 필터 탭 */}
<div className="flex gap-2">
  {(['active', 'expired', 'inactive', 'all'] as const).map((s) => (
    <Button
      key={s}
      variant={statusFilter === s ? 'default' : 'outline'}
      size="sm"
      onClick={() => { setStatusFilter(s); setPage(1); }}
    >
      {s === 'active' ? '활성' : s === 'expired' ? '만료' : s === 'inactive' ? '중지' : '전체'}
    </Button>
  ))}
</div>
```

**빈 상태 메시지 (TableBody 내):**
```tsx
{codes.length === 0 && (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
      {search
        ? `"${search}"에 해당하는 코드가 없습니다.`
        : statusFilter === 'active' ? '활성 코드가 없습니다.'
        : statusFilter === 'expired' ? '만료된 코드가 없습니다.'
        : statusFilter === 'inactive' ? '중지된 코드가 없습니다.'
        : '발급된 코드가 없습니다.'}
    </TableCell>
  </TableRow>
)}
```

**import 추가:**
```typescript
import { Search } from 'lucide-react'
// Input은 현재 미사용이면 추가, 이미 import돼 있으면 생략
import { Input } from '@/components/ui/input'
```

**완료 조건:**
- [x] 검색창 — 코드키 또는 상품명으로 300ms 디바운스 후 검색 실행
- [x] 상태 필터 탭 4개 (활성/만료/중지/전체) — 기본값 '활성'
- [x] 탭/검색 변경 시 page=1로 리셋 + 목록 재조회
- [x] 빈 상태 메시지 (상태 필터/검색어에 맞는 메시지)
- [x] 기존 테이블 컬럼 (코드/상품/주문수/만료일/수량/상태/버튼) 유지
- [x] 기존 toggleCode, copyCode, kakaoMessage 기능 동작 유지

---

**구현 순서:** 57A (API 수정) → 57B (UI 수정)

**주의사항:**
- 기존 코드 목록 기본값이 '전체'에서 '활성'으로 변경됨 — 셀러가 만료/중지 코드를 보려면 탭 전환 필요
- 57B에서 `Input` 컴포넌트 이미 import 되어 있을 경우 중복 추가 금지
- `Search` 아이콘은 lucide-react에서 import

---

## ✅ 완료된 작업

### Task 56: 셀러 상품 활성/비활성 토글 + 비활성 상품 목록 표시 ✅ (2026-04-09 완료)

- [x] 56A: `POST /api/seller/products/[id]/toggle` — 상품 활성/비활성 토글 (소유 검증, isActive 반전)
- [x] 56B: `GET /api/seller/products` — `?status=active|inactive|all` 필터 지원
- [x] 56C: `/seller/products` 목록 — 상태 필터 탭 + 토글 버튼 + opacity-60 비활성 처리
- [x] 56D: `/seller/products/[id]` 상세 — "판매 중지"/"판매 재개" 버튼 + fetchProduct useCallback

---

### Task 55: 셀러 코드 편집 / 삭제 ✅ (2026-04-09 완료)

- [x] 55A: `PATCH /api/seller/codes/[id]` — 만료일/최대수량 수정 (소유 검증, 과거날짜/음수/usedQty 미만 400, 0=무제한)
- [x] 55B: `DELETE /api/seller/codes/[id]` — 주문 없는 코드만 삭제 (주문 있으면 409)
- [x] 55C: `/seller/codes/[id]` 편집 다이얼로그 + 삭제 버튼 (fetchData useCallback 분리, 저장 후 새로고침)

---

### Task 54: 셀러 상품 상세 페이지 ✅ (2026-04-09 완료)

- [x] 54A: `GET /api/seller/products/[id]` 확장 (codes 목록 + 주문 통계)
- [x] 54B: `/seller/products/[id]` 상세 페이지 (상품정보/통계3개/코드테이블/Skeleton/빈상태)
- [x] 54C: `/seller/products` 카드 클릭 → 상세 연결 + 버튼 stopPropagation

---

### Task 53: 셀러 코드 상세 페이지 ✅ (2026-04-09 완료)

- [x] 53A: `GET /api/seller/codes/[id]` 추가 (코드 상세 + 주문 목록 + 통계)
- [x] 53B: `/seller/codes/[id]` 상세 페이지 (코드정보/통계3개/주문테이블/Skeleton/Pagination)
- [x] 53C: `/seller/codes` 목록 행 클릭 → `/seller/codes/[id]` 연결

---

### Task 52: 관리자 상품/코드 관리 페이지 ✅

**완료일:** 2026-04-09

- [x] 52A: `GET /api/admin/products` — isActive/sellerId/q 필터 + 페이지네이션
- [x] 52B: `GET/PATCH /api/admin/products/[id]` — 상품 상세 + 활성 토글 (400/401/404 처리)
- [x] 52C: `/admin/products` 목록 페이지 (테이블, 필터, 검색 디바운스 300ms, Skeleton 5행)
- [x] 52D: `/admin/products/[id]` 상세 페이지 (이미지 미리보기, 코드 목록, 토스트)
- [x] 52E: AdminShell 사이드바 "상품 관리" (Package 아이콘) 메뉴 추가

---

### Task 51: 관리자 셀러 승인 즉시 처리 UX 개선 ✅

**완료일:** 2026-04-09

- [x] `app/admin/layout.tsx` — Toaster 컴포넌트 추가 (sonner)
- [x] `app/admin/sellers/page.tsx` — 로딩 상태(Set<id>), 성공/에러 토스트, 파괴적 액션 confirm 다이얼로그, 빈 상태 표시
- [x] `app/admin/sellers/[id]/page.tsx` — 로딩 상태(boolean), 성공/에러 토스트, 파괴적 액션 confirm 다이얼로그

---

### Task 50: 관리자 대시보드 개선 ✅

**완료일:** 2026-04-09

- [x] 50A: `GET /api/admin/dashboard` 응답 확장 (todayRevenue, thisMonthRevenue, dailySales, recentOrders, pendingSellerList)
- [x] 50B: 관리자 대시보드 UI 개선 (통계 카드 6개, 매출 차트, 승인 대기 셀러, 최근 주문)

---

### Task 49: 관리자 정산 상세 페이지 ✅

**완료일:** 2026-04-09

- [x] 49A: `GET /api/admin/settlements/[id]` + `PATCH /api/admin/settlements/[id]`
- [x] 49B: `/admin/settlements/[id]` 페이지 신규 생성
- [x] 49C: `/admin/settlements` 목록 행 클릭 → `router.push('/admin/settlements/' + id)` 연결

---

### Task 48: 관리자 주문 상세 페이지 ✅

**완료일:** 2026-04-09

- [x] 48A: `GET /api/admin/orders/[id]`
- [x] 48B: `/admin/orders/[id]` 페이지 신규 생성
- [x] 48C: `/admin/orders` 목록 행 클릭 연결

---

### Task 47: 관리자 셀러 상세 페이지 ✅

**완료일:** 2026-04-09

- [x] 47A: `GET /api/admin/sellers/[id]`
- [x] 47B: `GET /api/admin/sellers/[id]/orders`
- [x] 47C: `/admin/sellers/[id]` 페이지 신규 생성
- [x] 47D: `/admin/sellers` 목록 행 클릭 연결

---

### Task 46: 셀러 주문 상세 페이지 + 주문 검색 ✅

**완료일:** 2026-04-09

- [x] 46A: `GET /api/seller/orders/[id]`
- [x] 46B: `GET /api/seller/orders` `?q=` 검색 파라미터
- [x] 46C: `/seller/orders/[id]` 상세 페이지 UI
- [x] 46D: `/seller/orders` 목록 행 클릭 연결

---

### Task 45: 셀러 설정 페이지 ✅

- [x] 45A: `GET/PATCH /api/seller/me`
- [x] 45B: `POST /api/seller/me/password`
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
