# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Task 55 완료 확인 + Task 56 스펙 수립: 셀러 상품 활성/비활성 토글 + 비활성 상품 목록)_

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

## ✅ 완료된 작업

### Task 55: 셀러 코드 편집 / 삭제 ✅ (2026-04-09 완료)

- [x] 55A: `PATCH /api/seller/codes/[id]` — 만료일/최대수량 수정 (소유 검증, 과거날짜/음수/usedQty 미만 400, 0=무제한)
- [x] 55B: `DELETE /api/seller/codes/[id]` — 주문 없는 코드만 삭제 (주문 있으면 409)
- [x] 55C: `/seller/codes/[id]` 편집 다이얼로그 + 삭제 버튼 (fetchData useCallback 분리, 저장 후 새로고침)

---

## Dev1 현재 작업

### Task 56: 셀러 상품 활성/비활성 토글 + 비활성 상품 목록 표시

**목표:** 셀러가 상품을 일시 중지(비활성화)하고, 필요 시 다시 활성화할 수 있도록 구현

**배경:**
- 현재 상품 목록(`/seller/products`)은 `isActive: true`만 표시 → 비활성화된 상품 재활성화 불가
- 상품 삭제(DELETE) API는 soft-delete(isActive=false)이나, 목록에서 사라지므로 실질적으로 영구 삭제처럼 동작
- 상품 상세 페이지에 활성/비활성 토글 버튼이 없음 (코드 상세 페이지와 달리)
- 코드(`/api/seller/codes/[id]/toggle`)와 동일한 패턴을 상품에도 적용

---

#### 56A: `POST /api/seller/products/[id]/toggle` — 상품 활성/비활성 토글

**신규 파일:** `app/api/seller/products/[id]/toggle/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const product = await prisma.product.findFirst({
    where: { id, sellerId: session.user.id },
  })
  if (!product)
    return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  })

  return NextResponse.json({ isActive: updated.isActive })
}
```

**완료 조건:**
- [ ] 본인 상품만 토글 가능 (타인 상품 → 404)
- [ ] isActive 값이 반전되어 반환
- [ ] `{ isActive: boolean }` 응답

---

#### 56B: `GET /api/seller/products` — `?status` 필터 지원

**수정 파일:** `app/api/seller/products/route.ts`

현재 `isActive: true` 고정 → status 파라미터로 필터:

```typescript
// GET 핸들러 내 where 부분 수정
const status = searchParams.get('status') ?? 'active'
const isActiveFilter =
  status === 'all' ? {} :
  status === 'inactive' ? { isActive: false } :
  { isActive: true }
const where = { sellerId: session.user.id, ...isActiveFilter }
```

**완료 조건:**
- [ ] `?status=active` (기본) → isActive=true 상품만
- [ ] `?status=inactive` → isActive=false 상품만
- [ ] `?status=all` → 전체 상품 (활성+비활성)
- [ ] 기존 페이지네이션 동작 유지

---

#### 56C: `/seller/products` 목록 페이지 — 상태 필터 탭 + 토글 버튼

**수정 파일:** `app/seller/products/page.tsx`

**추가할 상태:**
```typescript
const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
const [toggling, setToggling] = useState<string | null>(null)
```

**fetch 수정:**
```typescript
// fetchProducts 함수의 fetch URL 수정
fetch(`/api/seller/products?page=${currentPage}&status=${statusFilter}`)
```

**필터 탭 UI (카드 위에 추가):**
```tsx
<div className="flex gap-2 mb-4">
  {(['active', 'inactive', 'all'] as const).map((s) => (
    <Button
      key={s}
      variant={statusFilter === s ? 'default' : 'outline'}
      size="sm"
      onClick={() => { setStatusFilter(s); setPage(1) }}
    >
      {s === 'active' ? '활성' : s === 'inactive' ? '비활성' : '전체'}
    </Button>
  ))}
</div>
```

**토글 핸들러:**
```typescript
async function handleToggle(product: Product) {
  setToggling(product.id)
  try {
    const res = await fetch(`/api/seller/products/${product.id}/toggle`, { method: 'POST' })
    if (!res.ok) { toast.error('상태 변경 실패'); return }
    const { isActive } = await res.json()
    toast.success(isActive ? '상품이 활성화되었습니다.' : '상품이 비활성화되었습니다.')
    fetchProducts(page)
  } catch {
    toast.error('서버 오류가 발생했습니다.')
  } finally {
    setToggling(null)
  }
}
```

**카드에 토글 버튼 추가 (기존 연필/휴지통 버튼 영역):**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => { e.stopPropagation(); handleToggle(product) }}
  disabled={toggling === product.id}
>
  {toggling === product.id
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : product.isActive ? '중지' : '활성화'}
</Button>
```

**비활성 상품 카드 시각 처리:**
```tsx
// 카드 className에 조건부 추가
className={`... ${!product.isActive ? 'opacity-60' : ''}`}
```

**import 추가:**
```typescript
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
```

**완료 조건:**
- [ ] 상태 필터 탭 (활성/비활성/전체) — 탭 전환 시 목록 즉시 갱신
- [ ] 각 상품 카드에 "활성화" / "중지" 버튼 (현재 상태 반전)
- [ ] 토글 성공 → toast + 목록 새로고침
- [ ] 비활성 상품은 opacity-60으로 시각적 구분
- [ ] 기본 필터는 'active' (기존 동작 유지)

---

#### 56D: `/seller/products/[id]` 상세 페이지 — 토글 버튼 추가

**수정 파일:** `app/seller/products/[id]/page.tsx`

**추가 상태:**
```typescript
const [toggling, setToggling] = useState(false)
const fetchProduct = useCallback(() => {
  setLoading(true)
  fetch(`/api/seller/products/${id}`)
    .then((r) => { if (!r.ok) throw new Error(); return r.json() })
    .then((res) => setProduct(res))
    .catch(() => toast.error('상품 정보를 불러오지 못했습니다.'))
    .finally(() => setLoading(false))
}, [id])

useEffect(() => { fetchProduct() }, [fetchProduct])
```
(기존 useEffect fetch 로직을 fetchProduct로 추출, useCallback import 추가)

**토글 핸들러:**
```typescript
async function handleToggle() {
  if (!product) return
  setToggling(true)
  try {
    const res = await fetch(`/api/seller/products/${id}/toggle`, { method: 'POST' })
    if (!res.ok) { toast.error('상태 변경 실패'); return }
    const { isActive } = await res.json()
    toast.success(isActive ? '상품이 활성화되었습니다.' : '상품이 비활성화되었습니다.')
    fetchProduct()
  } finally {
    setToggling(false)
  }
}
```

**헤더 버튼 추가 (기존 "수정" 버튼 앞에):**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleToggle}
  disabled={toggling || !product}
>
  {toggling
    ? <Loader2 className="h-4 w-4 animate-spin" />
    : product?.isActive ? '판매 중지' : '판매 재개'}
</Button>
```

**import 추가:**
```typescript
import { useCallback } from 'react'
import { Loader2 } from 'lucide-react'
```
(Loader2가 이미 import돼 있으면 생략, useCallback은 기존 useState, useEffect 옆에 추가)

**완료 조건:**
- [ ] 헤더에 "판매 중지" / "판매 재개" 버튼 표시 (isActive에 따라 전환)
- [ ] 토글 성공 → toast + 상품 데이터 새로고침 (fetchProduct 재호출)
- [ ] loading 중이거나 product 없으면 버튼 disabled

---

**구현 순서:** 56A (신규 파일) → 56B (기존 파일 수정) → 56C → 56D

**주의사항:**
- 56A는 코드 toggle(`app/api/seller/codes/[id]/toggle/route.ts`)과 동일한 패턴
- 56C에서 `toast`가 기존에 import 안 돼 있으면 `import { toast } from 'sonner'` 추가
- 56D에서 `useCallback` 미import 시 추가 필요

---

## ✅ 완료된 작업

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
