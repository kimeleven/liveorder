# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Task 54 완료 확인 + Task 55 스펙 수립: 셀러 코드 편집/삭제)_

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

### Task 55: 셀러 코드 편집 / 삭제

**목표:** 셀러가 생성된 코드의 만료일과 최대 수량을 수정하고, 주문이 없는 코드를 삭제할 수 있도록 구현

**배경:**
- 현재 코드 생성 후 수정 방법 없음 (만료일/수량 오설정 시 삭제 후 재생성 필요)
- `/seller/codes/[id]` 상세 페이지에 활성/비활성 토글만 있음
- 코드 편집(PATCH)과 삭제(DELETE) API가 미구현

---

#### 55A: `PATCH /api/seller/codes/[id]` — 코드 만료일/최대수량 수정

**수정 파일:** `app/api/seller/codes/[id]/route.ts`

기존 GET 핸들러에 `PATCH` 추가:

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const existing = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
  })
  if (!existing)
    return NextResponse.json({ error: '코드를 찾을 수 없습니다.' }, { status: 404 })

  const { expiresAt, maxQty } = body
  const updateData: Record<string, unknown> = {}

  if (expiresAt !== undefined) {
    const d = new Date(expiresAt)
    if (isNaN(d.getTime()))
      return NextResponse.json({ error: '유효하지 않은 날짜입니다.' }, { status: 400 })
    if (d <= new Date())
      return NextResponse.json({ error: '만료일은 현재 시간보다 이후여야 합니다.' }, { status: 400 })
    updateData.expiresAt = d
  }

  if (maxQty !== undefined) {
    const qty = Number(maxQty)
    if (!Number.isInteger(qty) || qty < 0)
      return NextResponse.json({ error: '최대 주문 수량은 0 이상의 정수여야 합니다.' }, { status: 400 })
    if (qty > 0 && qty < existing.usedQty)
      return NextResponse.json(
        { error: `이미 ${existing.usedQty}건 주문됨. 최대 수량은 ${existing.usedQty} 이상이어야 합니다.` },
        { status: 400 }
      )
    updateData.maxQty = qty
  }

  if (Object.keys(updateData).length === 0)
    return NextResponse.json({ error: '변경할 필드가 없습니다.' }, { status: 400 })

  const updated = await prisma.code.update({ where: { id }, data: updateData })
  return NextResponse.json(updated)
}
```

**완료 조건:**
- [ ] 본인 코드만 수정 가능 (타인 → 404)
- [ ] expiresAt 과거 날짜 → 400
- [ ] maxQty 음수 → 400, usedQty보다 작으면 → 400
- [ ] 0은 무제한으로 허용
- [ ] 변경 필드 없으면 → 400

---

#### 55B: `DELETE /api/seller/codes/[id]` — 코드 삭제 (주문 없는 경우만)

**수정 파일:** `app/api/seller/codes/[id]/route.ts` (55A와 같은 파일)

```typescript
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const code = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
    include: { _count: { select: { orders: true } } },
  })
  if (!code)
    return NextResponse.json({ error: '코드를 찾을 수 없습니다.' }, { status: 404 })

  if (code._count.orders > 0)
    return NextResponse.json(
      { error: `주문이 ${code._count.orders}건 있는 코드는 삭제할 수 없습니다. 비활성화를 사용하세요.` },
      { status: 409 }
    )

  await prisma.code.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

**완료 조건:**
- [ ] 본인 코드만 삭제 가능
- [ ] 주문 있는 코드 → 409 에러 + 비활성화 안내 메시지
- [ ] 주문 없는 코드 → 삭제 성공 `{ success: true }`

---

#### 55C: `/seller/codes/[id]` 페이지에 편집 다이얼로그 + 삭제 버튼 추가

**수정 파일:** `app/seller/codes/[id]/page.tsx`

**추가 import:**
```typescript
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
```

**추가 상태 (기존 toggling 아래에):**
```typescript
const [editOpen, setEditOpen] = useState(false)
const [editForm, setEditForm] = useState({ expiresAt: '', maxQty: '' })
const [saving, setSaving] = useState(false)
const [deleting, setDeleting] = useState(false)
```

**fetch 함수 추출 (useEffect 내 fetch 로직을 별도 함수로):**
```typescript
const fetchData = useCallback(() => {
  setLoading(true)
  fetch(`/api/seller/codes/${id}?page=${page}`)
    .then((r) => r.json())
    .then((d) => setData(d))
    .catch(() => toast.error('데이터를 불러오지 못했습니다.'))
    .finally(() => setLoading(false))
}, [id, page])

useEffect(() => { fetchData() }, [fetchData])
```
(기존 useEffect에서 직접 호출하던 fetch를 위 fetchData로 교체)
참고: `useCallback`은 `import { useEffect, useState, useCallback } from 'react'` 로 추가

**편집 오픈 핸들러:**
```typescript
function openEdit() {
  if (!data) return
  const d = new Date(data.code.expiresAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  setEditForm({ expiresAt: local, maxQty: String(data.code.maxQty) })
  setEditOpen(true)
}
```

**저장 핸들러:**
```typescript
async function handleSave() {
  setSaving(true)
  try {
    const res = await fetch(`/api/seller/codes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : undefined,
        maxQty: editForm.maxQty !== '' ? Number(editForm.maxQty) : undefined,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? '저장 실패')
      return
    }
    toast.success('코드가 수정되었습니다.')
    setEditOpen(false)
    fetchData()
  } finally {
    setSaving(false)
  }
}
```

**삭제 핸들러:**
```typescript
async function handleDelete() {
  if (!confirm('이 코드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
  setDeleting(true)
  try {
    const res = await fetch(`/api/seller/codes/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? '삭제 실패')
      return
    }
    toast.success('코드가 삭제되었습니다.')
    router.push('/seller/codes')
  } finally {
    setDeleting(false)
  }
}
```

**헤더 버튼 영역 변경 (기존 토글 버튼 앞에 편집/삭제 추가):**
```typescript
{/* 기존 토글 버튼 앞에 추가 */}
<Button variant="outline" size="sm" onClick={openEdit} disabled={!data}>
  <Pencil className="h-4 w-4 mr-1" /> 편집
</Button>
<Button
  variant="outline"
  size="sm"
  className="text-destructive hover:text-destructive"
  onClick={handleDelete}
  disabled={deleting || !data}
>
  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
</Button>
{/* 기존 토글 버튼 */}
```

**편집 다이얼로그 JSX (return 문 내부, SellerShell 밖 또는 안에):**
```typescript
<Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>코드 편집</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>만료일</Label>
        <Input
          type="datetime-local"
          value={editForm.expiresAt}
          onChange={(e) => setEditForm((f) => ({ ...f, expiresAt: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>
          최대 주문 수량{' '}
          <span className="text-muted-foreground text-xs">(0 = 무제한)</span>
        </Label>
        <Input
          type="number"
          min={0}
          value={editForm.maxQty}
          onChange={(e) => setEditForm((f) => ({ ...f, maxQty: e.target.value }))}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
        취소
      </Button>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**완료 조건:**
- [ ] 편집 버튼 → 다이얼로그 오픈, 현재값(만료일/최대수량) 초기화
- [ ] 저장 → PATCH 호출 → 성공 toast + 페이지 데이터 새로고침 (setData 재호출)
- [ ] API 에러 시 toast.error로 서버 메시지 표시
- [ ] 삭제 버튼 → confirm → DELETE 호출 → 성공 시 `/seller/codes` 이동
- [ ] 주문 있는 코드 삭제 시도 → toast.error "주문이 N건 있는 코드는 삭제할 수 없습니다" 표시
- [ ] loading 중이거나 data 없으면 편집/삭제 버튼 disabled

---

**구현 순서:** 55A → 55B (같은 파일) → 55C

**주의사항:**
- Dialog 컴포넌트: `@/components/ui/dialog` 사용 (shadcn/ui)
- `useCallback` import 추가 필요
- 기존 useEffect의 fetch 로직을 `fetchData` 함수로 추출해야 저장 후 새로고침 가능
- Skeleton 및 Loader2는 이미 import 되어 있음

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
