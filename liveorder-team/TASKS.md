# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Task 52 완료 확인 + Task 53 스펙 수립: 셀러 코드 상세 페이지)_

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

### Task 53: 셀러 코드 상세 페이지 + 주문 연결 조회

**목표:** 셀러가 코드 클릭 시 해당 코드의 주문 현황 및 통계를 즉시 확인할 수 있도록 구현

**배경:**
- 현재 `/seller/codes` 목록에서 코드 정보만 보임
- 코드별 주문 현황 조회 불가 (`/seller/codes/[id]` 상세 페이지 없음)
- `GET /api/seller/codes/[id]` 미구현 (PUT toggle만 있음)

---

#### 53A: `GET /api/seller/codes/[id]` 추가

**수정 파일:** `app/api/seller/codes/[id]/route.ts`

기존 PUT(toggle) 핸들러는 유지하고 GET 핸들러 추가:

```typescript
import { parsePagination, buildPaginationResponse } from '@/lib/pagination'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const { page, limit, skip } = parsePagination(searchParams)

  // 소유권 확인: product.sellerId === session.user.id
  const code = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
    include: {
      product: { select: { id: true, name: true, price: true, imageUrl: true } },
    },
  })
  if (!code)
    return NextResponse.json({ error: '코드를 찾을 수 없습니다.' }, { status: 404 })

  const [orders, total, statsAgg] = await prisma.$transaction([
    prisma.order.findMany({
      where: { codeId: id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true, buyerName: true, buyerPhone: true,
        quantity: true, amount: true, status: true, createdAt: true,
      },
    }),
    prisma.order.count({ where: { codeId: id } }),
    prisma.order.aggregate({
      where: { codeId: id, status: { not: 'REFUNDED' } },
      _sum: { amount: true },
      _avg: { amount: true },
      _count: { id: true },
    }),
  ])

  const maskedOrders = orders.map((o) => ({
    ...o,
    buyerPhone: o.buyerPhone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '***-****-$3'),
  }))

  return NextResponse.json({
    code,
    stats: {
      totalOrders: statsAgg._count.id,
      totalRevenue: statsAgg._sum.amount ?? 0,
      avgOrderAmount: Math.round(statsAgg._avg.amount ?? 0),
    },
    orders: maskedOrders,
    pagination: buildPaginationResponse(orders, total, page, limit).pagination,
  })
}
```

**완료 조건:**
- [ ] 본인 코드만 조회 가능 (타 셀러 → 404)
- [ ] stats: REFUNDED 제외한 통계 계산
- [ ] buyerPhone 마스킹 (***-****-XXXX)
- [ ] 페이지네이션 표준 응답

---

#### 53B: `/seller/codes/[id]` 상세 페이지

**신규 파일:** `app/seller/codes/[id]/page.tsx`

**타입 정의 (파일 상단):**
```typescript
interface CodeDetailResponse {
  code: {
    id: string
    codeKey: string
    expiresAt: string
    maxQty: number
    usedQty: number
    isActive: boolean
    createdAt: string
    product: { id: string; name: string; price: number; imageUrl: string | null }
  }
  stats: { totalOrders: number; totalRevenue: number; avgOrderAmount: number }
  orders: {
    id: string; buyerName: string; buyerPhone: string
    quantity: number; amount: number; status: string; createdAt: string
  }[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
```

**UI 구조:**
```
SellerShell
  └── div.space-y-6 (max-w-5xl mx-auto)
        ├── [헤더 행]
        │     Button variant="ghost" onClick → router.back()  (← 코드 목록)
        │     h1: code.codeKey (text-2xl font-bold font-mono)
        │     Badge: 활성/중지/만료/소진 상태
        │     Button: 활성화/비활성화 (toggling 시 Loader2 + disabled)
        │
        ├── [코드 정보 카드] Card
        │     Grid 2cols: 상품명(Link→/seller/products/[id]) | 유효기간
        │     Grid 2cols: 최대수량(0=무제한) | 사용/잔여 수량
        │
        ├── [통계 3개] grid grid-cols-1 sm:grid-cols-3 gap-4
        │     Card: 총 주문 수 (stats.totalOrders)
        │     Card: 총 매출 (stats.totalRevenue.toLocaleString('ko-KR') + '원')
        │     Card: 평균 주문금액 (stats.avgOrderAmount)
        │
        └── [주문 목록 카드] Card
              CardHeader: "이 코드의 주문"
              로딩: Skeleton 5행
              빈 상태: "아직 이 코드로 들어온 주문이 없습니다."
              Table:
                columns: 주문번호(앞8자) | 구매자 | 전화 | 수량 | 금액 | 상태 | 일시
                행 클릭: router.push('/seller/orders/' + order.id)
                cursor-pointer hover:bg-muted/50
              Pagination (totalPages > 1)
```

**상태 배지 헬퍼:**
```typescript
function getCodeStatus(code) {
  if (!code.isActive) return { label: '중지', variant: 'secondary' }
  if (new Date(code.expiresAt) < new Date()) return { label: '만료', variant: 'destructive' }
  if (code.maxQty > 0 && code.usedQty >= code.maxQty) return { label: '소진', variant: 'outline' }
  return { label: '활성', variant: 'default' }
}

function getOrderStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PAID: { label: '결제완료', variant: 'default' },
    SHIPPING: { label: '배송중', variant: 'secondary' },
    DELIVERED: { label: '배송완료', variant: 'outline' },
    SETTLED: { label: '정산완료', variant: 'outline' },
    REFUNDED: { label: '환불', variant: 'destructive' },
  }
  return map[status] ?? { label: status, variant: 'outline' }
}
```

**완료 조건:**
- [ ] 코드 정보 카드 (상품명 링크, 만료일, 수량)
- [ ] 통계 3개 카드 (주문수/총매출/평균금액)
- [ ] 주문 테이블 (행 클릭 → /seller/orders/[id])
- [ ] Skeleton 로딩 (5행)
- [ ] 빈 상태 메시지
- [ ] 코드 토글 (sonner toast 성공/에러)
- [ ] Pagination

---

#### 53C: `/seller/codes` 목록 행 클릭 연결

**수정 파일:** `app/seller/codes/page.tsx`

- `useRouter` import 추가 (없으면)
- `const router = useRouter()`
- `<TableRow>` 에 `onClick={() => router.push('/seller/codes/' + code.id)}` 추가
- `<TableRow className="cursor-pointer hover:bg-muted/50">` 클래스 추가

**완료 조건:**
- [ ] 행 클릭 시 `/seller/codes/[id]` 이동

---

**구현 순서:** 53A → 53B → 53C

**주의사항:**
- `sonner` 토스트 사용 (기존 코드와 통일)
- `parsePagination`, `buildPaginationResponse` from `@/lib/pagination` 사용
- Skeleton은 `@/components/ui/skeleton` import

---

## ✅ 완료된 작업

### Task 53: 셀러 코드 상세 페이지 ⏳ (진행 예정)

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
