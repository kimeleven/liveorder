# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Task 53 완료 확인 + Task 54 스펙 수립: 셀러 상품 상세 페이지)_

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

### Task 54: 셀러 상품 상세 페이지

**목표:** 셀러가 상품 카드 클릭 시 해당 상품의 코드 현황 및 주문 통계를 즉시 확인할 수 있도록 구현

**배경:**
- 현재 `/seller/products` 목록(카드 그리드)에서 수정/삭제 버튼만 있음
- `/seller/products/[id]` 상세 페이지 없음 (edit 페이지만 존재)
- `GET /api/seller/products/[id]` 기본 정보만 반환 (코드 목록, 통계 없음)
- 셀러가 상품별 코드 현황 및 주문 성과를 즉시 파악 불가

---

#### 54A: `GET /api/seller/products/[id]` 확장

**수정 파일:** `app/api/seller/products/[id]/route.ts`

기존 GET 핸들러를 확장하여 코드 목록 + 주문 통계 반환:

```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const product = await prisma.product.findFirst({
    where: { id, sellerId: session.user.id },
    include: {
      codes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          codeKey: true,
          isActive: true,
          expiresAt: true,
          maxQty: true,
          usedQty: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      },
    },
  })

  if (!product)
    return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })

  // 상품 전체 주문 통계
  const statsAgg = await prisma.order.aggregate({
    where: { code: { productId: id }, status: { not: 'REFUNDED' } },
    _sum: { amount: true },
    _count: { id: true },
  })

  return NextResponse.json({
    ...product,
    stats: {
      totalOrders: statsAgg._count.id,
      totalRevenue: statsAgg._sum.amount ?? 0,
      activeCodeCount: product.codes.filter((c) => c.isActive).length,
    },
  })
}
```

**완료 조건:**
- [x] 본인 상품만 조회 가능 (타 셀러 → 404)
- [x] codes 배열 포함 (id, codeKey, isActive, expiresAt, maxQty, usedQty, _count.orders)
- [x] stats: totalOrders, totalRevenue (REFUNDED 제외), activeCodeCount

---

#### 54B: `/seller/products/[id]` 상세 페이지

**신규 파일:** `app/seller/products/[id]/page.tsx`

**타입 정의 (파일 상단):**
```typescript
interface ProductDetailResponse {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  category: string
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  codes: {
    id: string
    codeKey: string
    isActive: boolean
    expiresAt: string
    maxQty: number
    usedQty: number
    createdAt: string
    _count: { orders: number }
  }[]
  stats: { totalOrders: number; totalRevenue: number; activeCodeCount: number }
}
```

**UI 구조:**
```
SellerShell
  └── div.space-y-6 (max-w-5xl mx-auto)
        ├── [헤더 행]
        │     Button variant="ghost" onClick → router.back()  (← 상품 목록)
        │     h1: product.name (text-2xl font-bold)
        │     Badge: 판매중/중지
        │     Button: "수정" → router.push('/seller/products/[id]/edit')
        │
        ├── [상품 정보 카드] Card (grid 2cols on md+)
        │     좌: 이미지 (imageUrl 있으면 <img> 미리보기, 없으면 회색 placeholder)
        │     우: 카테고리 | 가격(₩N.toLocaleString()) | 재고 | 등록일
        │         설명(있으면)
        │
        ├── [통계 3개] grid grid-cols-1 sm:grid-cols-3 gap-4
        │     Card: 총 주문 수 (stats.totalOrders)
        │     Card: 총 매출 (stats.totalRevenue.toLocaleString('ko-KR') + '원')
        │     Card: 활성 코드 수 (stats.activeCodeCount + '개')
        │
        └── [코드 목록 카드] Card
              CardHeader: "발급된 코드" + Button "코드 추가" → router.push('/seller/codes/new?productId='+id)
              로딩: Skeleton 3행
              빈 상태: "발급된 코드가 없습니다." + "코드 발급하기" 버튼
              Table:
                columns: 코드 | 주문수 | 만료일 | 최대/사용 | 상태
                행 클릭: router.push('/seller/codes/' + code.id)
                cursor-pointer hover:bg-muted/50
                비활성 코드: opacity-60
```

**상태 배지 헬퍼:**
```typescript
function getCodeStatus(code: ProductDetailResponse['codes'][0]) {
  if (!code.isActive) return { label: '중지', variant: 'secondary' as const }
  if (new Date(code.expiresAt) < new Date()) return { label: '만료', variant: 'destructive' as const }
  if (code.maxQty > 0 && code.usedQty >= code.maxQty) return { label: '소진', variant: 'outline' as const }
  return { label: '활성', variant: 'default' as const }
}
```

**완료 조건:**
- [x] 상품 기본 정보 카드 (이미지 미리보기 또는 placeholder, 카테고리/가격/재고/설명)
- [x] 통계 3개 카드 (총주문/총매출/활성코드수)
- [x] 코드 목록 테이블 (행 클릭 → /seller/codes/[id])
- [x] Skeleton 로딩 (3행)
- [x] 빈 상태 메시지 + "코드 발급하기" 버튼
- [x] 수정 버튼 → /seller/products/[id]/edit
- [x] "코드 추가" 버튼 → /seller/codes/new (productId 쿼리스트링)

---

#### 54C: `/seller/products` 목록 카드 클릭 → 상세 연결

**수정 파일:** `app/seller/products/page.tsx`

현재 카드 그리드 형태. 카드 자체를 클릭 → 상세 페이지 이동:

- `<Card>` 에 `onClick={() => router.push('/seller/products/' + product.id)}` 추가
- `<Card className="... cursor-pointer">` 클래스 추가
- 기존 수정/삭제 버튼의 onClick에 `e.stopPropagation()` 추가 (카드 클릭 이벤트 버블링 방지)

```typescript
// 수정 버튼
onClick={(e) => { e.stopPropagation(); router.push(`/seller/products/${product.id}/edit`) }}

// 삭제 버튼
onClick={(e) => { e.stopPropagation(); setDeleteTarget(product) }}
```

**완료 조건:**
- [x] 카드 클릭 시 `/seller/products/[id]` 이동
- [x] 수정/삭제 버튼 클릭 시 카드 onClick 버블링 방지

---

**구현 순서:** 54A → 54B → 54C

**주의사항:**
- Skeleton은 `@/components/ui/skeleton` import
- 통계 카드는 Task 53B와 동일한 패턴 유지
- 코드 목록 테이블은 Task 53B의 코드 정보 카드를 참고
- `sonner` 토스트 사용 (현재 Task에서 토스트 불필요하지만, 향후 확장 대비)

---

## ✅ 완료된 작업

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
