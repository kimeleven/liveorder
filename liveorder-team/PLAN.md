# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 54 완료 확인, Task 55 스펙 수립: 셀러 코드 편집/삭제)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 55 진행) |
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

---

## Task 55 — 셀러 코드 편집 / 삭제

### 배경

현재 셀러는 코드를 생성한 후 **수정할 방법이 없다**.
- 만료일을 잘못 설정해도 삭제 후 재생성해야 함
- 최대 주문 수량을 변경하고 싶어도 방법이 없음
- 주문이 없는 테스트용 코드를 삭제할 수 없음

코드 상세 페이지(`/seller/codes/[id]`)가 구현되어 있고, 토글(활성/비활성) 기능도 있으므로
이 페이지에 **편집 다이얼로그** + **삭제 버튼**을 추가하는 것이 가장 자연스럽다.

### 목표

- 셀러가 코드의 만료일과 최대 주문 수량을 수정할 수 있도록
- 주문이 없는 코드는 삭제 가능하도록
- 주문이 있는 코드는 삭제 불가 — "비활성화하면 더 이상 주문을 받지 않을 수 있습니다." 안내

### 레이아웃 변경 (코드 상세 페이지)

```
/seller/codes/[id]
┌─────────────────────────────────────────────────────────────────┐
│ ← 코드 목록     ABC-1234-ABCD   [활성 배지]   [활성화/중지] [편집] [삭제] │
├─────────────────────────────────────────────────────────────────┤
│ (기존) 코드 정보 카드 / 통계 / 주문 테이블                           │
└─────────────────────────────────────────────────────────────────┘

편집 다이얼로그:
┌─────────────────────────────────┐
│ 코드 편집                        │
│                                 │
│ 만료일: [날짜 입력]               │
│ 최대 주문 수량: [숫자 입력] (0=무제한) │
│                                 │
│           [취소]  [저장]          │
└─────────────────────────────────┘
```

---

### 서브태스크

#### 55A: `PATCH /api/seller/codes/[id]`

**수정 파일:** `app/api/seller/codes/[id]/route.ts`

기존 GET 핸들러에 PATCH 추가:

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

  // 본인 코드인지 확인
  const existing = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
  })
  if (!existing)
    return NextResponse.json({ error: '코드를 찾을 수 없습니다.' }, { status: 404 })

  // 유효성 검사
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
    // maxQty가 현재 usedQty보다 작으면 거부
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
- [ ] 본인 코드만 수정 가능 (타인 코드 → 404)
- [ ] expiresAt: 과거 날짜 → 400
- [ ] maxQty: 음수 → 400, usedQty보다 작으면 → 400 (기존 주문 수 보호)
- [ ] 0은 무제한으로 허용
- [ ] 변경 필드 없으면 → 400

---

#### 55B: `DELETE /api/seller/codes/[id]`

**수정 파일:** `app/api/seller/codes/[id]/route.ts` (PATCH와 같은 파일에 추가)

```typescript
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 본인 코드 + 주문 수 확인
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
- [ ] 주문 있는 코드 → 409 (삭제 불가, 비활성화 안내)
- [ ] 주문 없는 코드 → 200 삭제 성공

---

#### 55C: 코드 상세 페이지 편집 다이얼로그 추가

**수정 파일:** `app/seller/codes/[id]/page.tsx`

현재 헤더 버튼 영역: `[활성화/중지]` 버튼만 있음.
여기에 `[편집]` + `[삭제]` 버튼 추가.

**추가할 상태:**
```typescript
const [editOpen, setEditOpen] = useState(false)
const [editForm, setEditForm] = useState({ expiresAt: '', maxQty: '' })
const [saving, setSaving] = useState(false)
const [deleting, setDeleting] = useState(false)
```

**편집 버튼 클릭 시 초기값 설정:**
```typescript
function openEdit() {
  if (!data) return
  // datetime-local 형식: YYYY-MM-DDTHH:mm
  const d = new Date(data.code.expiresAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  setEditForm({
    expiresAt: local,
    maxQty: String(data.code.maxQty),
  })
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
    // 페이지 데이터 새로고침
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

**다이얼로그 UI (shadcn/ui Dialog 사용):**
```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// JSX:
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
          onChange={(e) => setEditForm(f => ({ ...f, expiresAt: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>최대 주문 수량 <span className="text-muted-foreground text-xs">(0 = 무제한)</span></Label>
        <Input
          type="number"
          min={0}
          value={editForm.maxQty}
          onChange={(e) => setEditForm(f => ({ ...f, maxQty: e.target.value }))}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>취소</Button>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**헤더 버튼 영역 변경:**
```typescript
// 기존: [활성화/중지 버튼]
// 변경: [편집 버튼] [삭제 버튼] [활성화/중지 버튼]

<Button variant="outline" size="sm" onClick={openEdit}>
  <Pencil className="h-4 w-4 mr-1" /> 편집
</Button>
<Button
  variant="outline"
  size="sm"
  className="text-destructive hover:text-destructive"
  onClick={handleDelete}
  disabled={deleting}
>
  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
</Button>
```

**import 추가 필요:**
- `Pencil` from `lucide-react`
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` from `@/components/ui/dialog`
- `Input` from `@/components/ui/input`
- `Label` from `@/components/ui/label`

**완료 조건:**
- [ ] 헤더에 편집/삭제 버튼 추가
- [ ] 편집 버튼 클릭 → 다이얼로그 오픈, 현재값 초기화
- [ ] 만료일/최대수량 수정 후 저장 → PATCH 호출 → 성공 토스트 + 데이터 새로고침
- [ ] API 에러 시 toast.error로 서버 메시지 표시
- [ ] 삭제 버튼 클릭 → confirm 다이얼로그 → DELETE 호출 → 성공 시 `/seller/codes` 이동
- [ ] 주문 있는 코드 삭제 시도 → toast.error 로 "주문이 N건 있는 코드는 삭제할 수 없습니다" 표시

---

### 구현 순서

55A → 55B (같은 파일) → 55C

---

*최종 업데이트: 2026-04-09 (Planner)*
