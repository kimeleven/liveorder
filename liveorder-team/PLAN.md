# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 51 완료 확인, Task 52 스펙 수립)_

---

## 프로젝트 개요

기존 v1 웹 기반 주문 플랫폼 위에 **카카오톡 챗봇 주문 플로우** 추가.
- v1: Next.js 기반 웹 플랫폼 (Phase 1+2+3 완료)
- v3: 카카오톡 오픈빌더 챗봇 연동 (Phase 4 완료, 재가동 대기 중)

---

## 현재 단계 요약

| Phase | 상태 |
|-------|------|
| Phase 1 — MVP | ✅ 완료 |
| Phase 2 — 고도화 | ✅ 완료 |
| Phase 3 — 확장 | 🔧 진행 중 (Task 52 예정) |
| Phase 4 — 카카오 챗봇 v3 | ✅ 완료 (재가동 대기 중) |

---

## 완료된 태스크 요약

| Task | 내용 |
|------|------|
| 1~33 | Phase 1+2 전체 (MVP + 고도화) |
| 34 | 사업자등록증 이미지 업로드 |
| 35 | KakaoPaySession 모델 + 카카오 결제 진입 페이지 |
| 36 | 카카오 webhook + session API (Phase 4 핵심) |
| 37 | seller.id 누락 버그 수정 |
| 38 | 오픈빌더 설정 문서 + 셀러 카카오 안내 UI |
| 39 | 카카오 세션 정리 cron + 웹훅 봇 ID 검증 |
| 40 | 주문 소스 추적 (web/kakao) |
| 41~42 | 세션 일회성 보장 + CSV source 컬럼 + 대시보드 채널 통계 |
| 43 | 운송장 일괄 CSV 업로드 |
| 44 | 주문 30초 자동갱신 + PAID 배지 + 주별/월별 매출 차트 |
| 45 | 셀러 설정 페이지 `/seller/settings` + GET/PATCH `/api/seller/me` + 비밀번호 변경 + 이용약관 동의 |
| 46 | 셀러 주문 상세 페이지 `/seller/orders/[id]` + `GET /api/seller/orders/[id]` + 주문 검색 (`?q=`) |
| 47 | 관리자 셀러 상세 페이지 `/admin/sellers/[id]` + `GET /api/admin/sellers/[id]` + `GET /api/admin/sellers/[id]/orders` + 목록 행 클릭 연결 |
| 48 | 관리자 주문 상세 페이지 `/admin/orders/[id]` + `GET /api/admin/orders/[id]` + 목록 행 클릭 연결 |
| 49 | 관리자 정산 상세 페이지 `/admin/settlements/[id]` + `GET/PATCH /api/admin/settlements/[id]` + 목록 행 클릭 연결 |
| 50 | 관리자 대시보드 개선 — 매출 차트 + 승인 대기 셀러 + 최근 주문 + 통계 카드 6개 |
| 51 | 관리자 셀러 승인 즉시 처리 UX 개선 — 로딩 상태 + 토스트 알림 + confirm 다이얼로그 |

---

## Task 52 — 관리자 상품/코드 관리 페이지

### 배경

현재 관리자 패널에는 **상품(Product) 관리 기능이 없음**.
- `app/admin/` 하위: dashboard, orders, sellers, settlements만 존재
- `app/api/admin/` 하위: dashboard, orders, sellers, settlements만 존재
- 관리자는 어떤 상품이 플랫폼에서 활성화되어 판매 중인지 확인/제어 불가

### 목표

- 전체 상품 목록 조회 (셀러별 필터, 활성/비활성 필터)
- 상품 상세 페이지 (연결된 코드 목록 포함)
- 상품 활성화/비활성화 즉시 처리 (UX: 로딩 + 토스트)
- 관리자 사이드바에 "상품 관리" 메뉴 추가

### 레이아웃

```
[관리자 사이드바]
  - 대시보드
  - 셀러 관리
  - 상품 관리  ← 신규
  - 주문 관리
  - 정산 관리
```

```
/admin/products (목록)
┌──────────────────────────────────────────────────────────┐
│ 상품 관리                     [활성 ▼] [셀러 ▼] 검색      │
├──────────────────────────────────────────────────────────┤
│ 상품명 | 셀러 | 카테고리 | 가격 | 재고 | 코드수 | 상태     │
│ [행 클릭 → /admin/products/id]                           │
└──────────────────────────────────────────────────────────┘

/admin/products/[id] (상세)
┌──────────────────────────────────────────────────────────┐
│ ← 뒤로     상품명 (상태 배지)    [활성화/비활성화 버튼]    │
├────────────────────┬─────────────────────────────────────┤
│ 상품 정보 카드      │ 코드 목록                            │
│ - 셀러명           │ 코드키 | 만료일 | 수량 | 활성 여부     │
│ - 카테고리         │                                      │
│ - 가격/재고        │                                      │
│ - 이미지 URL       │                                      │
└────────────────────┴─────────────────────────────────────┘
```

### 서브태스크

---

#### 52A: `GET /api/admin/products` — 전체 상품 목록

**신규 파일:** `app/api/admin/products/route.ts`

**쿼리 파라미터:**
- `page` (기본값: 1)
- `limit` (기본값: 20)
- `isActive` (`'true'` | `'false'` | 없으면 전체)
- `sellerId` (특정 셀러 필터)
- `q` (상품명 검색)

**반환 타입:**
```typescript
{
  items: {
    id: string
    name: string
    price: number
    stock: number
    isActive: boolean
    category: string
    imageUrl: string | null
    createdAt: string
    seller: { id: string; name: string; email: string }
    _count: { codes: number }
  }[]
  total: number
  page: number
  limit: number
}
```

**구현 상세:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePagination } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { page, limit } = parsePagination(searchParams)
  const isActiveParam = searchParams.get('isActive')
  const sellerId = searchParams.get('sellerId')
  const q = searchParams.get('q')

  const where: Record<string, unknown> = {}
  if (isActiveParam === 'true') where.isActive = true
  if (isActiveParam === 'false') where.isActive = false
  if (sellerId) where.sellerId = sellerId
  if (q) where.name = { contains: q, mode: 'insensitive' }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        category: true,
        imageUrl: true,
        createdAt: true,
        seller: { select: { id: true, name: true, email: true } },
        _count: { select: { codes: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}
```

**완료 조건:**
- [ ] isActive 필터 동작
- [ ] sellerId 필터 동작
- [ ] q 상품명 검색 동작
- [ ] 페이지네이션 표준 (`parsePagination` 활용)
- [ ] seller 정보 포함
- [ ] _count.codes 포함

---

#### 52B: `GET /api/admin/products/[id]` + `PATCH /api/admin/products/[id]`

**신규 파일:** `app/api/admin/products/[id]/route.ts`

**GET 반환 타입:**
```typescript
{
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  isActive: boolean
  category: string
  imageUrl: string | null
  createdAt: string
  seller: { id: string; name: string; email: string; phone: string }
  codes: {
    id: string
    codeKey: string
    expiresAt: string
    maxQty: number
    usedQty: number
    isActive: boolean
    createdAt: string
  }[]
}
```

**PATCH 요청 바디:**
```typescript
{ isActive: boolean }  // 활성화/비활성화 토글
```

**구현 상세:**
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
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      isActive: true,
      category: true,
      imageUrl: true,
      createdAt: true,
      seller: { select: { id: true, name: true, email: true, phone: true } },
      codes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          codeKey: true,
          expiresAt: true,
          maxQty: true,
          usedQty: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  })

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { isActive } = body

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive must be boolean' }, { status: 400 })
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true, name: true },
  })

  return NextResponse.json(product)
}
```

**완료 조건:**
- [ ] GET — 상품 상세 + 코드 목록 반환
- [ ] PATCH — isActive 토글
- [ ] 404 처리
- [ ] admin 인증 검증

---

#### 52C: `/admin/products` 목록 페이지

**신규 파일:** `app/admin/products/page.tsx`

**구현 포인트:**
1. `'use client'` + `useRouter`
2. 상태: `items`, `total`, `page`, `isActiveFilter` (`''|'true'|'false'`), `q` (검색어)
3. `fetchProducts()` — `GET /api/admin/products?page=&isActive=&q=`
4. 검색 입력 디바운스 300ms (`useRef` + `setTimeout`)
5. 테이블 컬럼:
   - 상품명 (굵게)
   - 셀러 (text-muted-foreground, 클릭 시 `/admin/sellers/[sellerId]`)
   - 카테고리
   - 가격 (`₩N.toLocaleString()`)
   - 재고
   - 코드수 (`_count.codes`건)
   - 상태 (`<Badge variant={isActive ? 'default' : 'secondary'}>`)
6. 행 클릭: `router.push('/admin/products/' + id)`
7. 필터 영역:
   - `<Select>` — 활성 상태 전체/활성/비활성
   - `<Input>` — 상품명 검색
8. 페이지네이션 (이전/다음 버튼)
9. Skeleton 로딩 (5행)
10. `AdminShell` 래핑

**완료 조건:**
- [ ] 목록 테이블 (상품명/셀러/카테고리/가격/재고/코드수/상태)
- [ ] 활성 상태 필터
- [ ] 상품명 검색 (디바운스)
- [ ] 행 클릭 → `/admin/products/[id]`
- [ ] 셀러명 클릭 → `/admin/sellers/[sellerId]`
- [ ] 페이지네이션
- [ ] Skeleton 로딩
- [ ] AdminShell 래핑

---

#### 52D: `/admin/products/[id]` 상세 페이지

**신규 파일:** `app/admin/products/[id]/page.tsx`

**구현 포인트:**
1. `'use client'` + `useParams` + `useRouter`
2. `fetchProduct()` — `GET /api/admin/products/[id]`
3. `handleToggleActive()` — `PATCH /api/admin/products/[id]` + 토스트 알림
4. 로딩 상태 (isLoading: boolean), 처리 중 상태 (isPatching: boolean)
5. 레이아웃:
   - 상단: `← 뒤로` 버튼 + 상품명 + 상태 Badge + `[활성화/비활성화]` 버튼
   - 2컬럼:
     - 좌: 상품 정보 Card
       - 셀러명/이메일/전화 (클릭 → `/admin/sellers/[sellerId]`)
       - 카테고리, 가격, 재고
       - 상품설명 (있으면)
       - 이미지 URL (있으면 `<img>` 미리보기)
       - 등록일
     - 우: 코드 목록 Card
       - 컬럼: 코드키, 만료일, 사용수량/최대수량, 상태
       - 비활성 코드는 `opacity-50`
       - 코드 없으면 "등록된 코드가 없습니다."
6. `toast.success` / `toast.error` (sonner) — layout.tsx에 이미 Toaster 있음
7. AdminShell 래핑

**완료 조건:**
- [ ] 상품 기본 정보 표시 (이미지 미리보기 포함)
- [ ] 셀러 정보 + 클릭 → `/admin/sellers/[id]`
- [ ] 코드 목록 (codeKey, 만료일, 수량, 상태)
- [ ] 활성화/비활성화 버튼 + 로딩/토스트
- [ ] Skeleton 로딩
- [ ] AdminShell 래핑

---

#### 52E: AdminShell 사이드바에 "상품 관리" 메뉴 추가

**수정 파일:** `components/admin/AdminShell.tsx` (또는 동등한 사이드바 컴포넌트)

**추가 내용:**
- 기존 사이드바 메뉴 순서: 대시보드 → 셀러 관리 → 주문 관리 → 정산 관리
- **변경 후:** 대시보드 → 셀러 관리 → **상품 관리** → 주문 관리 → 정산 관리
- `href="/admin/products"`, 아이콘: `Package` from `lucide-react`

**완료 조건:**
- [ ] "상품 관리" 메뉴 항목 추가 (Package 아이콘)
- [ ] active 상태 (현재 경로 일치 시 highlighted)

---

### 구현 순서

52A → 52B → 52C → 52D → 52E

---

*최종 업데이트: 2026-04-09 (Planner)*
