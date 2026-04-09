# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Dev1 — Task 47 완료: 관리자 셀러 상세 페이지 47A~47D)_

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

### Task 47: 관리자 셀러 상세 페이지

**우선순위:** HIGH
**이유:** 현재 관리자 `/admin/sellers`에서 셀러 행 클릭 시 아무 동작 없음. 운영자가 특정 셀러의 주문 현황, 매출 통계, 기본 정보를 한 눈에 볼 수 없어 운영 불편. Task 46과 동일한 패턴으로 관리자 측 드릴다운 페이지 구현.

---

#### 47A: `GET /api/admin/sellers/[id]` — 기존 파일에 GET 핸들러 추가 ✅

**수정 파일:** `app/api/admin/sellers/[id]/route.ts`

> ⚠️ 주의: 이 파일에 이미 `PUT` 핸들러가 있음. PUT은 건드리지 말고 `GET` 핸들러만 추가.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const seller = await prisma.seller.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, repName: true,
      businessNo: true, phone: true, address: true,
      bankAccount: true, bankName: true, tradeRegNo: true,
      bizRegImageUrl: true, status: true, plan: true,
      emailVerified: true, createdAt: true,
    },
  })
  if (!seller) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

  const [productCount, codeCount, orderStats, pendingSettlement] = await Promise.all([
    prisma.product.count({ where: { sellerId: id, isActive: true } }),
    prisma.code.count({ where: { product: { sellerId: id }, isActive: true } }),
    prisma.order.aggregate({
      where: {
        code: { product: { sellerId: id } },
        status: { notIn: ['REFUNDED'] },
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.settlement.aggregate({
      where: { sellerId: id, status: 'PENDING' },
      _sum: { netAmount: true },
    }),
  ])

  return NextResponse.json({
    ...seller,
    stats: {
      productCount,
      codeCount,
      orderCount: orderStats._count.id,
      totalRevenue: orderStats._sum.amount ?? 0,
      pendingSettlement: pendingSettlement._sum.netAmount ?? 0,
    },
  })
}
```

**완료 조건:**
- [x] 관리자 세션 없으면 401
- [x] 없는 ID → 404
- [x] stats 5개 필드 반환 (productCount, codeCount, orderCount, totalRevenue, pendingSettlement)

---

#### 47B: `GET /api/admin/sellers/[id]/orders` 신규 생성 ✅

**파일 신규 생성:** `app/api/admin/sellers/[id]/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const status = searchParams.get('status') || undefined

  const where = {
    code: { product: { sellerId: id } },
    ...(status ? { status } : {}),
  }

  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id: true, buyerName: true, buyerPhone: true,
        quantity: true, amount: true, status: true,
        trackingNo: true, carrier: true, source: true, createdAt: true,
        code: { select: { codeKey: true, product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    data,
    pagination: { page, totalPages: Math.ceil(total / limit), total },
  })
}
```

**완료 조건:**
- [x] 페이지네이션 동작 (`page`, `totalPages`, `total`)
- [x] `?status=PAID` 등 필터 동작
- [x] 빈 결과도 정상 반환 (404 아님)

---

#### 47C: `/admin/sellers/[id]` 페이지 신규 생성 ✅

**파일 신규 생성:** `app/admin/sellers/[id]/page.tsx`

**레이아웃 (3섹션):**
```
┌─────────────────────────────────────────────────────┐
│ ← 셀러 목록  |  [상호명]  [상태배지]  [승인/거부/정지] │
├─────────────────┬───────────────────────────────────┤
│ 셀러 기본정보    │ 통계 카드 4개 (grid 2×2)            │
│ 이메일           │ [총 주문수]    [총 매출액]           │
│ 대표자명         │ [활성 상품수]  [대기 정산액]         │
│ 사업자번호       │                                    │
│ 연락처/주소      │                                    │
│ 정산계좌         │                                    │
│ 사업자등록증     │                                    │
├─────────────────┴───────────────────────────────────┤
│ 주문 목록                                             │
│ 상태 필터: [전체][PAID][SHIPPING][DELIVERED][REFUNDED]│
│ 테이블: 주문ID | 상품명 | 구매자 | 금액 | 상태 | 날짜  │
│ 페이지네이션                                          │
└─────────────────────────────────────────────────────┘
```

**구현 포인트:**
1. `'use client'` + `useParams<{ id: string }>()`로 ID 추출
2. `fetchSeller()` → `GET /api/admin/sellers/[id]` (정보 + 통계)
3. `fetchOrders(page, statusFilter)` → `GET /api/admin/sellers/[id]/orders`
4. 상태 변경 버튼 (승인/거부/정지):
   - `PUT /api/admin/sellers/[id]` body: `{ status: 'APPROVED' | 'PENDING' | 'SUSPENDED' }` (기존 엔드포인트 재사용)
   - 성공 후 `fetchSeller()` 재호출 → 배지 즉시 갱신
5. `bizRegImageUrl` 있으면 `<a href={url} target="_blank" rel="noopener noreferrer">사업자등록증 보기 →</a>` 표시
6. 통계 카드 숫자: `toLocaleString()` 포맷, 금액은 `₩` 접두사
7. 주문 테이블 행 클릭 없음
8. `AdminShell` 래핑 필수
9. 로딩 중에는 skeleton 또는 `로딩 중...` 텍스트

**상태 배지 variant 매핑:**
```typescript
const statusVariant = {
  PENDING: 'secondary',
  APPROVED: 'default',
  SUSPENDED: 'destructive',
}
```

**완료 조건:**
- [x] 셀러 기본정보 전체 표시 (이메일, 대표자, 사업자번호, 연락처, 주소, 정산계좌)
- [x] 사업자등록증 이미지 링크 (있을 때만)
- [x] 통계 카드 4개 (총 주문수, 총 매출, 활성 상품수, 대기 정산액) 정상 표시
- [x] 주문 목록 페이지네이션 동작
- [x] 상태 필터 동작 (전체/PAID/SHIPPING/DELIVERED/REFUNDED)
- [x] 승인/거부/정지 버튼 동작 + 상태 즉시 반영

---

#### 47D: `/admin/sellers` 목록 행 클릭 연결 ✅

**수정 파일:** `app/admin/sellers/page.tsx`

변경 내용 2가지:
1. 상단에 `import { useRouter } from 'next/navigation'` 추가
2. 컴포넌트 내 `const router = useRouter()` 추가
3. `TableRow`에 클릭 + 커서 스타일 추가:

```tsx
<TableRow
  key={seller.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => router.push(`/admin/sellers/${seller.id}`)}
>
```

**완료 조건:**
- [x] 셀러 행 클릭 시 `/admin/sellers/[id]`로 이동
- [x] 마우스 pointer 커서 적용

---

#### 마무리

- [x] `git add app/api/admin/sellers/ app/admin/sellers/`
- [x] `git commit -m 'feat: Task 47 — 관리자 셀러 상세 페이지 (47A~47D)'`
- [x] `git push origin main`

---

## ✅ 완료된 작업

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
