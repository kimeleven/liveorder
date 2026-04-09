# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Task 52 스펙 수립: 관리자 상품/코드 관리 페이지)_

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

### Task 52: 관리자 상품/코드 관리 페이지

**우선순위:** HIGH
**이유:** 관리자 패널에 상품 관리 기능이 없음. 어떤 상품이 플랫폼에서 활성화 중인지 확인/제어 불가. 관리자 패널 완성을 위해 필수.

---

#### 52A: `GET /api/admin/products` — 전체 상품 목록 API

**신규 파일:** `app/api/admin/products/route.ts`

**쿼리 파라미터:** `page` (기본 1), `limit` (기본 20), `isActive` (`'true'`|`'false'`|없으면 전체), `sellerId`, `q` (상품명 검색)

**구현:**
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
- [ ] isActive/sellerId/q 필터 동작
- [ ] 페이지네이션 (`parsePagination` 활용)
- [ ] seller 정보 + _count.codes 포함

---

#### 52B: `GET/PATCH /api/admin/products/[id]` — 상품 상세 + 활성 토글 API

**신규 파일:** `app/api/admin/products/[id]/route.ts`

**GET 반환:** 상품 전체 정보 + `seller` (id/name/email/phone) + `codes[]` (id/codeKey/expiresAt/maxQty/usedQty/isActive/createdAt)
**PATCH 바디:** `{ isActive: boolean }` — 활성/비활성 토글

**구현:**
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
      id: true, name: true, description: true, price: true, stock: true,
      isActive: true, category: true, imageUrl: true, createdAt: true,
      seller: { select: { id: true, name: true, email: true, phone: true } },
      codes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, codeKey: true, expiresAt: true,
          maxQty: true, usedQty: true, isActive: true, createdAt: true,
        },
      },
    },
  })

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
  const { isActive } = await req.json()

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
- [ ] PATCH — isActive 토글 + 400/401/404 처리

---

#### 52C: `/admin/products` 목록 페이지

**신규 파일:** `app/admin/products/page.tsx`

**구현 포인트:**
1. `'use client'` + `useRouter`
2. 상태: `items`, `total`, `page`, `isActiveFilter: ''|'true'|'false'`, `q`
3. 검색 디바운스 300ms
4. 테이블 컬럼: 상품명(bold) / 셀러(muted, 클릭 → `/admin/sellers/[id]`) / 카테고리 / 가격(₩) / 재고 / 코드수 / 상태(Badge)
5. 행 클릭 → `router.push('/admin/products/' + id)`
6. 필터: 상태 Select + 검색 Input
7. 페이지네이션 (이전/다음)
8. Skeleton 5행 로딩
9. `AdminShell` 래핑

**완료 조건:**
- [ ] 테이블 (상품명/셀러/카테고리/가격/재고/코드수/상태)
- [ ] 활성 상태 필터 + 상품명 검색 (디바운스)
- [ ] 행 클릭 → `/admin/products/[id]`
- [ ] 셀러명 클릭 → `/admin/sellers/[sellerId]`
- [ ] 페이지네이션 + Skeleton

---

#### 52D: `/admin/products/[id]` 상세 페이지

**신규 파일:** `app/admin/products/[id]/page.tsx`

**구현 포인트:**
1. `'use client'` + `useParams` + `useRouter`
2. `fetchProduct()` — `GET /api/admin/products/[id]`
3. `handleToggleActive()` — `PATCH /api/admin/products/[id]` + `toast.success`/`toast.error`
4. 상단: `← 뒤로` + 상품명 + 상태 Badge + 활성/비활성 버튼 (isPatching 로딩)
5. 2컬럼:
   - 좌: 상품 정보 Card (셀러명→클릭/이메일/전화, 카테고리, 가격, 재고, 설명, 이미지 미리보기, 등록일)
   - 우: 코드 목록 Card (codeKey/만료일/수량/상태, 비활성은 opacity-50)
6. Skeleton 로딩
7. `AdminShell` 래핑

**완료 조건:**
- [ ] 상품 정보 표시 (이미지 미리보기 포함)
- [ ] 셀러 정보 + 클릭 → `/admin/sellers/[id]`
- [ ] 코드 목록 (codeKey, 만료일, 수량, 상태)
- [ ] 활성/비활성 버튼 + 로딩 상태 + 토스트

---

#### 52E: AdminShell 사이드바 "상품 관리" 메뉴 추가

**수정 파일:** `components/admin/AdminShell.tsx` (실제 파일명 확인 후 수정)

**변경 내용:**
- 기존: 대시보드 → 셀러 관리 → 주문 관리 → 정산 관리
- **변경:** 대시보드 → 셀러 관리 → **상품 관리** → 주문 관리 → 정산 관리
- `href="/admin/products"`, 아이콘: `Package` from `lucide-react`

**완료 조건:**
- [ ] "상품 관리" 메뉴 항목 추가 (Package 아이콘)
- [ ] active 하이라이트 동작

---

**구현 순서:** 52A → 52B → 52C → 52D → 52E

---

## ✅ 완료된 작업

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
