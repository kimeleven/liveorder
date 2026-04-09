# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Task 56 완료 확인 + Task 57 스펙 수립: 셀러 코드 목록 상태 필터 + 검색)_

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

### Task 57: 셀러 코드 목록 상태 필터 + 검색

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
- [ ] `?status=active` → isActive=true AND expiresAt > now 코드만
- [ ] `?status=expired` → expiresAt <= now 코드만 (isActive 무관)
- [ ] `?status=inactive` → isActive=false AND expiresAt > now 코드만
- [ ] `?status=all` (또는 파라미터 없음) → 전체 코드
- [ ] `?q=검색어` → codeKey 또는 product.name 포함 (대소문자 무시)
- [ ] 기존 페이지네이션 (`parsePagination` + `buildPaginationResponse`) 동작 유지
- [ ] `include: { product: { select: { name: true } } }` 유지

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
- [ ] 검색창 — 코드키 또는 상품명으로 300ms 디바운스 후 검색 실행
- [ ] 상태 필터 탭 4개 (활성/만료/중지/전체) — 기본값 '활성'
- [ ] 탭/검색 변경 시 page=1로 리셋 + 목록 재조회
- [ ] 빈 상태 메시지 (상태 필터/검색어에 맞는 메시지)
- [ ] 기존 테이블 컬럼 (코드/상품/주문수/만료일/수량/상태/버튼) 유지
- [ ] 기존 toggleCode, copyCode, kakaoMessage 기능 동작 유지

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
