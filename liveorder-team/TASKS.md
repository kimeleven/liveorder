# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Planner — Task 41~42 완료 확인 + Task 43 스펙 수립)_

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

### Task 43: 운송장 일괄 CSV 업로드

**우선순위:** MEDIUM
**이유:** 주문량 증가 시 개별 운송장 등록은 매우 비효율. CSV 일괄 업로드로 셀러 운영 편의성 개선.

---

#### 43A: 배송지 CSV에 주문ID 컬럼 추가

**파일 수정:** `app/api/seller/orders/export/route.ts`

현재 헤더:
```
주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로
```

변경 후 (주문ID 첫 번째 컬럼 추가):
```typescript
const header = "주문ID,주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로\n";
```

rows map 첫 원소로 `o.id` 추가:
```typescript
const rows = orders
  .map((o) =>
    [
      o.id,  // ← 추가
      new Date(o.createdAt).toLocaleString("ko-KR"),
      o.code.product.name,
      o.code.codeKey,
      o.buyerName,
      o.buyerPhone,
      o.address,
      o.addressDetail ?? "",
      o.memo ?? "",
      o.quantity,
      o.amount,
      o.status,
      o.trackingNo ?? "",
      o.source === 'kakao' ? '카카오' : '웹',
    ]
    .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
    .join(",")
  )
  .join("\n");
```

---

#### 43B: 일괄 운송장 업로드 API

**파일 신규 생성:** `app/api/seller/orders/tracking/bulk/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const VALID_CARRIERS = ['CJ대한통운', '로젠택배', '한진택배', '롯데택배', '우체국택배']
const TRACKING_NO_REGEX = /^\d{10,15}$/

interface BulkRow {
  orderId: string
  carrier: string
  trackingNo: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sellerId = session.user.id

  const body = await req.json()
  const rows: BulkRow[] = body.rows

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '업로드할 데이터가 없습니다.' }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: '한 번에 최대 500건까지 처리 가능합니다.' }, { status: 400 })
  }

  let success = 0
  const errors: { orderId: string; error: string }[] = []

  for (const row of rows) {
    const { orderId, carrier, trackingNo } = row

    if (!orderId || !carrier || !trackingNo) {
      errors.push({ orderId: orderId ?? '', error: '주문ID, 택배사, 운송장번호는 필수입니다.' })
      continue
    }
    if (!VALID_CARRIERS.includes(carrier)) {
      errors.push({ orderId, error: `지원하지 않는 택배사: ${carrier}` })
      continue
    }
    if (!TRACKING_NO_REGEX.test(trackingNo)) {
      errors.push({ orderId, error: '운송장번호는 숫자 10~15자리입니다.' })
      continue
    }

    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          code: { product: { sellerId } },
          status: { in: ['PAID', 'SHIPPING'] },
        },
      })

      if (!order) {
        errors.push({ orderId, error: '주문을 찾을 수 없거나 권한이 없습니다.' })
        continue
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { carrier, trackingNo, status: 'SHIPPING' },
      })
      success++
    } catch {
      errors.push({ orderId, error: '처리 중 오류가 발생했습니다.' })
    }
  }

  return NextResponse.json({ success, failed: errors.length, errors })
}
```

---

#### 43C: 운송장 일괄 업로드 UI

**파일 수정:** `app/seller/orders/page.tsx`

**1. imports에 Upload 아이콘 추가:**
```typescript
import { Download, Truck, Upload } from "lucide-react"
```

**2. state 추가 (기존 state 선언 아래):**
```typescript
const [bulkDialog, setBulkDialog] = useState(false)
const [bulkParsed, setBulkParsed] = useState<{ orderId: string; carrier: string; trackingNo: string }[]>([])
const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: { orderId: string; error: string }[] } | null>(null)
const [bulkLoading, setBulkLoading] = useState(false)
const [bulkError, setBulkError] = useState('')
```

**3. 유틸 함수 추가 (컴포넌트 내부, JSX 앞):**
```typescript
function parseBulkCsv(text: string) {
  const lines = text.trim().split('\n').slice(1) // 헤더 제거
  return lines
    .map((line) => {
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
      return { orderId: cols[0] ?? '', carrier: cols[1] ?? '', trackingNo: cols[2] ?? '' }
    })
    .filter((r) => r.orderId && r.carrier && r.trackingNo)
}

function downloadBulkTemplate() {
  const csv = '\uFEFF주문ID,택배사,운송장번호\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tracking_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function handleBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  setBulkError('')
  setBulkResult(null)
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    const parsed = parseBulkCsv(text)
    setBulkParsed(parsed)
    if (parsed.length === 0) setBulkError('유효한 데이터가 없습니다. 템플릿을 확인해주세요.')
  }
  reader.readAsText(file, 'UTF-8')
}

async function submitBulkTracking() {
  if (bulkParsed.length === 0) return
  setBulkLoading(true)
  setBulkError('')
  try {
    const res = await fetch('/api/seller/orders/tracking/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: bulkParsed }),
    })
    const data = await res.json()
    if (!res.ok) {
      setBulkError(data.error || '업로드에 실패했습니다.')
      return
    }
    setBulkResult(data)
    if (data.success > 0) fetchOrders(page)
  } catch {
    setBulkError('서버 오류가 발생했습니다.')
  } finally {
    setBulkLoading(false)
  }
}
```

**4. 헤더 버튼에 "일괄 운송장 등록" 버튼 추가** (배송지 다운로드 버튼 뒤):
```tsx
<Button
  variant="outline"
  onClick={() => {
    setBulkDialog(true)
    setBulkParsed([])
    setBulkResult(null)
    setBulkError('')
  }}
>
  <Upload className="mr-2 h-4 w-4" /> 일괄 운송장 등록
</Button>
```

**5. 기존 운송장 다이얼로그 아래에 일괄 등록 다이얼로그 추가:**
```tsx
<Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>운송장 일괄 등록</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>CSV 파일로 여러 주문의 운송장을 한번에 등록합니다.</span>
        <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadBulkTemplate}>
          템플릿 다운로드
        </Button>
      </div>
      <div className="space-y-1">
        <Label>CSV 파일 선택</Label>
        <Input type="file" accept=".csv" onChange={handleBulkFileChange} />
        <p className="text-xs text-muted-foreground">
          형식: 주문ID, 택배사, 운송장번호 (헤더 포함)
        </p>
      </div>
      {bulkParsed.length > 0 && !bulkResult && (
        <p className="text-sm text-muted-foreground">
          {bulkParsed.length}건 파싱 완료. 업로드 버튼을 클릭하세요.
        </p>
      )}
      {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}
      {bulkResult && (
        <div className="rounded-md border p-3 space-y-1 text-sm">
          <p className="text-green-600 font-medium">✓ 성공: {bulkResult.success}건</p>
          {bulkResult.failed > 0 && (
            <>
              <p className="text-destructive font-medium">✗ 실패: {bulkResult.failed}건</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                {bulkResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e.orderId.slice(0, 8)}… — {e.error}</li>
                ))}
                {bulkResult.errors.length > 5 && (
                  <li>외 {bulkResult.errors.length - 5}건...</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setBulkDialog(false)}>닫기</Button>
      {!bulkResult && (
        <Button
          onClick={submitBulkTracking}
          disabled={bulkLoading || bulkParsed.length === 0}
        >
          {bulkLoading ? '업로드 중...' : `${bulkParsed.length}건 업로드`}
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

#### 43 완료 조건

- [ ] `app/api/seller/orders/export/route.ts` — 주문ID 첫 번째 컬럼 추가
- [ ] `app/api/seller/orders/tracking/bulk/route.ts` — POST 핸들러 신규 생성, 500건 상한, 셀러 소유 검증
- [ ] `app/seller/orders/page.tsx` — Upload import, state 추가, 3개 함수, "일괄 운송장 등록" 버튼, 다이얼로그
- [ ] 로컬 테스트:
  - 배송지 CSV 다운로드 → 주문ID 컬럼 확인
  - 템플릿 다운로드 → 데이터 입력 → 업로드 → 주문 목록 SHIPPING 전환 확인
  - 잘못된 운송장번호 → 실패 에러 메시지 확인
- [ ] git commit + push

---

## Planner 📋 역할

### 매 실행마다:
1. 기존 v1 코드 분석 → v3 확장 포인트 파악
2. 오픈빌더 봇 시나리오 설계 (대화 흐름, 블록 구조)
3. DB 스키마 설계 (판매자-봇 매핑, 상품, 주문, 배송)
4. API 설계 (스킬 서버 엔드포인트)
5. PLAN.md에 Phase별 기획 작성

---

## Dev1 📋 역할

### 매 실행마다:
1. TASKS.md에서 Dev1 할당 태스크 확인
2. PLAN.md에서 기획 내용 파악
3. 구현 → 테스트 → git add → commit → push
4. TASKS.md 업데이트

### 기술 규칙:
- 기존 v1 코드 구조 유지 — 새 기능은 별도 디렉토리/모듈로 추가
- DB 변경은 Prisma migration으로
- git user: kimeleven / kimeleven@gmail.com

---

## Dev2 📋 역할

### 매 실행마다:
1. TASKS.md에서 Dev2 할당 태스크 확인
2. 프론트엔드/관리자 페이지 구현
3. 판매자 관리자 페이지 (상품 등록, 주문 관리)
4. 구현 → 테스트 → git add → commit → push

---

## QA 📋 역할

### 매 실행마다:
1. 변경 파일만 검토 (git diff)
2. 스킬 서버 API 테스트
3. QA_REPORT.md 업데이트

---

## 로컬 환경
- 프로젝트: ~/eddy-agent/liveorder
- DB: PostgreSQL localhost:5432, liveorder
- GitHub: kimeleven/liveorder
- 기존 스택: Next.js + Prisma + PostgreSQL

---

## 완료된 작업

| Task | 내용 | 완료일 |
|------|------|--------|
| Task 42 | 셀러 대시보드 채널별 통계 API + UI 카드 | 2026-04-09 |
| Task 41 | 카카오 세션 일회성 삭제, CSV 주문경로 컬럼 추가 | 2026-04-09 |
| Task 40 | `orders.source` 필드 추가 (web/kakao), 카카오 진입 sessionStorage 플래그, 결제 API source 저장, 셀러 주문 목록 카카오 배지 UI | 2026-04-09 |
| Task 39 | `app/api/cron/kakao-session-cleanup/route.ts` cron 생성, `vercel.json` cron 추가, `app/api/kakao/webhook/route.ts` 봇 ID 검증 | 2026-04-09 |
| Task 38 | `docs/kakao-openbuilder-setup.md` 문서 작성, 셀러 코드 페이지 카카오 공지 복사 버튼, 셀러 대시보드 카카오 채널 안내 카드 | 2026-04-09 |
| Task 37 | `/api/kakao/session/[token]` seller 응답에 `id` 누락 버그 수정 → FlowSeller 타입 불일치 해결 | 2026-04-09 |
| Task 36 | 스킬 서버 webhook (commerceCard 응답), 세션 검증 API `/api/kakao/session/[token]`, 카카오 결제 진입 페이지 `/kakao/[token]` | 2026-04-09 |
| Task 35 | KakaoPaySession DB 마이그레이션 (`kakao_pay_sessions` 테이블), `lib/kakao.ts` 기본 구조, Prisma schema 반영 | 2026-04-09 |
| Task 34 | 사업자등록증 이미지 업로드 — `app/api/seller/biz-reg-upload/route.ts`, `app/seller/auth/register/page.tsx` UI, DB 마이그레이션 | 2026-04-09 |
| Task 1~33 | Phase 1+2+3 전체 기능 (v1 웹 플랫폼) | 2026-04-04 |

---

## 규칙
- Sanghun에게 직접 보고 금지 — Eddy가 통합 보고
- QA는 변경분만 검토 (토큰 절약)
- git user: kimeleven
