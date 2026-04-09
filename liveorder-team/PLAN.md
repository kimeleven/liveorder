# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 56 완료 확인, Task 57 스펙 수립: 셀러 코드 목록 상태 필터 + 검색)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 57 진행) |
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
| 47 | 관리자 셀러 상세 페이지 `/admin/sellers/[id]` + `GET /api/admin/sellers/[id]` + 목록 행 클릭 연결 |
| 48 | 관리자 주문 상세 페이지 `/admin/orders/[id]` + `GET /api/admin/orders/[id]` + 목록 행 클릭 연결 |
| 49 | 관리자 정산 상세 페이지 `/admin/settlements/[id]` + `GET/PATCH /api/admin/settlements/[id]` + 목록 행 클릭 연결 |
| 50 | 관리자 대시보드 개선 — 매출 차트 + 승인 대기 셀러 + 최근 주문 + 통계 카드 6개 |
| 51 | 관리자 셀러 승인 즉시 처리 UX 개선 — 로딩 상태 + 토스트 알림 + confirm 다이얼로그 |
| 52 | 관리자 상품/코드 관리 페이지 `/admin/products` + `GET/PATCH /api/admin/products` + 사이드바 메뉴 추가 |
| 53 | 셀러 코드 상세 페이지 `/seller/codes/[id]` + `GET /api/seller/codes/[id]` (코드 상세+주문목록+통계) |
| 54 | 셀러 상품 상세 페이지 `/seller/products/[id]` + `GET /api/seller/products/[id]` 확장 (코드목록+통계) + 상품 카드 클릭 연결 |
| 55 | 셀러 코드 편집/삭제 — `PATCH /api/seller/codes/[id]` + `DELETE /api/seller/codes/[id]` + 편집 다이얼로그 + 삭제 버튼 |
| 56 | 셀러 상품 활성/비활성 토글 — `POST /api/seller/products/[id]/toggle` + `?status` 필터 + 목록/상세 토글 버튼 |

---

## Task 57 — 셀러 코드 목록 상태 필터 + 검색

### 배경

현재 셀러 코드 관리에서 일관성 부재 및 UX 문제가 있다:

1. **상품 목록과 불일치**: 상품 목록(`/seller/products`)은 Task 56에서 `?status` 필터가 추가되었으나, 코드 목록(`/seller/codes`)은 전체를 한 번에 반환 (isActive/만료/소진 구분 없음)
2. **검색 불가**: 코드가 많아지면 특정 코드를 찾기 어려움. 상품명 또는 코드키로 검색 기능 없음
3. **만료 코드 방치**: 만료된 코드들이 목록에 섞여 있어 활성 코드 파악이 어려움

### 목표

- 코드 목록에 상태 필터(활성/만료/중지/전체) 탭 추가
- 코드키 또는 상품명으로 검색 기능 추가
- `GET /api/seller/codes`에 `?status` + `?q` 파라미터 지원

### 상태 구분 기준

```
active   = isActive: true AND expiresAt > now AND (maxQty=0 OR usedQty < maxQty)
expired  = expiresAt <= now  (isActive 무관)
inactive = isActive: false AND expiresAt > now
all      = 필터 없음
```

> 참고: "소진" (maxQty>0 && usedQty>=maxQty) 상태는 `active` 필터에서 제외 (별도 탭 없음 — 소진은 "만료"와 유사한 비활성 상태로 처리)

### 레이아웃 변경

```
/seller/codes
┌──────────────────────────────────────────────┐
│ 내 코드  [+ 코드 발급]                         │
│ [🔍 검색창 (코드키/상품명)]                     │
│ [활성] [만료] [중지] [전체]  ← 신규 필터 탭     │
├──────────────────────────────────────────────┤
│ (기존 테이블 그대로)                             │
└──────────────────────────────────────────────┘
```

### 서브태스크

#### 57A: `GET /api/seller/codes` — `?status` + `?q` 파라미터 지원

**수정 파일:** `app/api/seller/codes/route.ts`

```typescript
// status 파라미터 처리
const status = searchParams.get('status') ?? 'all'
const q = searchParams.get('q')?.trim() ?? ''
const now = new Date()

// status에 따른 where 조건
// active: isActive=true, expiresAt > now, (maxQty=0 OR usedQty < maxQty)
// expired: expiresAt <= now
// inactive: isActive=false, expiresAt > now
// all: 필터 없음

const statusFilter =
  status === 'active'   ? { isActive: true, expiresAt: { gt: now }, OR: [{ maxQty: 0 }, { usedQty: { lt: prisma.code.fields.maxQty } }] } :
  status === 'expired'  ? { expiresAt: { lte: now } } :
  status === 'inactive' ? { isActive: false, expiresAt: { gt: now } } :
  {}

// 검색 필터
const searchFilter = q ? {
  OR: [
    { codeKey: { contains: q, mode: 'insensitive' } },
    { product: { name: { contains: q, mode: 'insensitive' } } },
  ]
} : {}

const where = {
  product: { sellerId: session.user.id },
  ...statusFilter,
  ...searchFilter,
}
```

**주의사항:**
- `active` 상태의 `usedQty < maxQty` 조건은 Prisma에서 필드 비교가 복잡하므로, `maxQty: 0` (무제한) 또는 Raw SQL 사용
- 실제 구현에서는 `active` 필터를 단순화: `isActive: true, expiresAt: { gt: now }` (소진 여부는 프론트에서 뱃지로 표시)
- `mode: 'insensitive'` — Prisma PostgreSQL 검색 대소문자 무시

**완료 조건:**
- [ ] `?status=active` → isActive=true + expiresAt > now 코드만
- [ ] `?status=expired` → expiresAt <= now 코드만
- [ ] `?status=inactive` → isActive=false + expiresAt > now 코드만
- [ ] `?status=all` (또는 기본) → 전체
- [ ] `?q=검색어` → codeKey 또는 상품명 포함 코드 필터
- [ ] 기존 페이지네이션 동작 유지

---

#### 57B: `/seller/codes` 목록 페이지 — 상태 필터 탭 + 검색창 추가

**수정 파일:** `app/seller/codes/page.tsx`

**추가 상태:**
```typescript
const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'inactive' | 'all'>('active')
const [search, setSearch] = useState('')
const [searchInput, setSearchInput] = useState('')
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
fetch(`/api/seller/codes?page=${page}&status=${statusFilter}&q=${encodeURIComponent(search)}`)
```

**필터 탭 + 검색창 UI (테이블 위에 추가):**
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

**빈 상태 메시지 (statusFilter + search 기준):**
```tsx
{codes.length === 0 && (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
      {search
        ? `"${search}"에 해당하는 코드가 없습니다.`
        : statusFilter === 'active'
        ? '활성 코드가 없습니다.'
        : statusFilter === 'expired'
        ? '만료된 코드가 없습니다.'
        : statusFilter === 'inactive'
        ? '중지된 코드가 없습니다.'
        : '발급된 코드가 없습니다.'}
    </TableCell>
  </TableRow>
)}
```

**import 추가:**
```typescript
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
```
(Input은 이미 import돼 있을 수 있음 — 중복 확인)

**완료 조건:**
- [ ] 검색창 — 코드키 또는 상품명으로 300ms 디바운스 검색
- [ ] 상태 필터 탭 4개 (활성/만료/중지/전체) — 기본 '활성'
- [ ] 탭/검색 변경 시 page=1로 리셋 + 목록 재조회
- [ ] 빈 상태 메시지 (필터/검색에 맞는 메시지 표시)
- [ ] 기존 테이블/페이지네이션 그대로 유지

---

### 구현 순서

57A (API 수정) → 57B (UI 수정)

### 주의사항

- 기존 코드 목록은 상태 필터 없이 전체를 반환하므로, **기존 동작 변경**: 기본값을 `'active'`로 설정
  - 단, 기존에 코드 목록 페이지를 자주 보는 셀러가 있을 수 있으므로 'all' 탭도 명시적으로 제공
- `?status=active` 기본으로 바꾸면 만료/중지 코드는 기본적으로 안 보임 → 사용자에게 탭 안내 중요
- 57B에서 `Input`이 이미 import되어 있는지 확인 후 처리
- 검색 `q` 파라미터는 빈 문자열이면 전송 안 해도 됨 (`q=` 생략 또는 `q=` 빈값 모두 처리)

---

*최종 업데이트: 2026-04-09 (Planner)*
