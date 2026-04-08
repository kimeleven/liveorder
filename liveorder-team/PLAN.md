# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 41~42 완료 확인, Task 43 스펙 수립)_

---

## 프로젝트 개요

기존 v1 웹 기반 주문 플랫폼 위에 **카카오톡 챗봇 주문 플로우** 추가.
- v1: Next.js 기반 웹 플랫폼 (Phase 1+2+3 완료)
- v3: 카카오 오픈빌더 스킬 서버 + 결제 연결 페이지

---

## 현재 상태 (2026-04-09)

### Phase 4 완료된 작업
| Task | 내용 | 상태 |
|------|------|------|
| Task 34 | 사업자등록증 이미지 업로드 (Vercel Blob) | ✅ 완료 |
| Task 35 | KakaoPaySession DB 마이그레이션 + `lib/kakao.ts` | ✅ 완료 |
| Task 36 | 스킬 서버 webhook (commerceCard), 세션 API, 카카오 결제 진입 페이지 | ✅ 완료 |
| Task 37 | `/api/kakao/session/[token]` seller.id 누락 버그 수정 | ✅ 완료 |
| Task 38 | OpenBuilder 설정 문서 + 셀러 코드 페이지 카카오 공지 복사 버튼 + 셀러 대시보드 안내 카드 | ✅ 완료 |
| Task 39 | 카카오 세션 자동 정리 cron + 웹훅 봇 ID 검증 | ✅ 완료 |
| Task 40 | 주문 소스 추적 (`source: 'web' \| 'kakao'`) — DB 스키마, 결제 API, 셀러 주문 목록 카카오 배지 UI | ✅ 완료 |
| Task 41 | 카카오 세션 일회성 보장 (즉시 삭제) + CSV 주문경로 컬럼 추가 | ✅ 완료 |
| Task 42 | 셀러 대시보드 채널별 통계 (카카오 vs 웹, 최근 30일) | ✅ 완료 |

### 현재 진행
- **Task 43**: 운송장 일괄 CSV 업로드 (셀러 운영 효율화)

---

## 시스템 아키텍처 (확정)

```
[카카오 오픈빌더] → POST /api/kakao/webhook
                          │
                          ├→ 봇 ID 검증 (KAKAO_BOT_ID 환경변수)
                          ├→ 코드 패턴 추출 + DB 유효성 검증
                          ├→ KakaoPaySession 생성 (32자 토큰, 30분 만료)
                          └→ commerceCard 응답 (결제하기 → /kakao/[token])

[구매자] 결제하기 클릭 → /kakao/[token]
                          │
                          ├→ GET /api/kakao/session/[token] 검증 + 즉시 삭제 ← Task 41 완료
                          ├→ sessionStorage pendingCode 저장
                          ├→ sessionStorage kakaoSource='true' 저장
                          └→ /chat redirect → 기존 결제 플로우

[PaymentSummary] → POST /api/payments/confirm
                          │
                          ├→ sessionStorage에서 kakaoSource 읽기
                          ├→ body에 source: 'kakao' | 'web' 포함
                          └→ 결제 완료 후 셀러 이메일 알림 (구현됨)

[Vercel Cron 매일 03:00] → DELETE expired kakao_pay_sessions
[셀러 CSV 다운로드] → 주문경로 컬럼 포함 (웹/카카오)
[셀러 대시보드] → 채널별 주문 비율 통계 (최근 30일)

[셀러 운송장 일괄 업로드] ← Task 43 추가 예정
  ├→ 배송지 CSV에 주문ID 컬럼 추가
  └→ POST /api/seller/orders/tracking/bulk (JSON 배열)
```

---

## Phase 4: Task 43 상세 스펙

### 배경 / 목적

현재 운송장은 셀러가 주문 목록에서 **1건씩 다이얼로그**로 등록해야 한다.
주문이 많을 경우 매우 비효율적. CSV 파일로 일괄 등록 기능 추가.

### 사용 플로우
1. 셀러가 "배송지 다운로드" CSV 다운로드 (주문ID 컬럼 포함으로 개선)
2. CSV에 택배사, 운송장번호 입력
3. "일괄 운송장 등록" 버튼 클릭 → CSV 파일 업로드
4. 처리 결과 (성공 N건, 실패 N건) 표시

---

### Task 43A: 배송지 CSV에 주문ID 컬럼 추가

**파일 수정:** `app/api/seller/orders/export/route.ts`

현재 헤더:
```
주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로
```

수정 후 헤더 (주문ID를 첫 번째 컬럼으로 추가):
```
주문ID,주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로
```

rows map 수정 — 첫 번째 원소로 `o.id` 추가:
```typescript
const rows = orders
  .map((o) =>
    [
      o.id,  // ← 추가 (첫 번째 컬럼)
      new Date(o.createdAt).toLocaleString("ko-KR"),
      o.code.product.name,
      // ... 나머지 기존 컬럼
    ]
    .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
    .join(",")
  )
  .join("\n");
```

---

### Task 43B: 일괄 운송장 업로드 API

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

    // 기본 유효성 검증
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

    // 셀러 소유 주문인지 확인 + 업데이트
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

### Task 43C: 일괄 운송장 업로드 UI

**파일 수정:** `app/seller/orders/page.tsx`

#### 1. imports 추가
```typescript
import { Upload } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
```

#### 2. state 추가 (기존 state 선언 부분 아래)
```typescript
const [bulkDialog, setBulkDialog] = useState(false)
const [bulkFile, setBulkFile] = useState<File | null>(null)
const [bulkParsed, setBulkParsed] = useState<{ orderId: string; carrier: string; trackingNo: string }[]>([])
const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: { orderId: string; error: string }[] } | null>(null)
const [bulkLoading, setBulkLoading] = useState(false)
const [bulkError, setBulkError] = useState('')
```

#### 3. CSV 파싱 함수 추가 (컴포넌트 내부)
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
```

#### 4. 템플릿 다운로드 함수
```typescript
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
```

#### 5. 파일 선택 핸들러
```typescript
function handleBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  setBulkFile(file)
  setBulkError('')
  setBulkResult(null)
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    const parsed = parseBulkCsv(text)
    setBulkParsed(parsed)
    if (parsed.length === 0) setBulkError('유효한 데이터가 없습니다. 템플릿을 확인해주세요.')
  }
  reader.readAsText(file, 'UTF-8')
}
```

#### 6. 업로드 실행 함수
```typescript
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

#### 7. 버튼 UI 수정 — "일괄 운송장 등록" 버튼 추가
현재 헤더 버튼 영역:
```tsx
<div className="flex items-center gap-3">
  ...기존 Select...
  {orders.length > 0 && (
    <Button variant="outline" onClick={downloadExcel}>
      <Download className="mr-2 h-4 w-4" /> 배송지 다운로드
    </Button>
  )}
</div>
```

수정 후:
```tsx
<div className="flex items-center gap-3">
  ...기존 Select...
  {orders.length > 0 && (
    <Button variant="outline" onClick={downloadExcel}>
      <Download className="mr-2 h-4 w-4" /> 배송지 다운로드
    </Button>
  )}
  <Button variant="outline" onClick={() => { setBulkDialog(true); setBulkFile(null); setBulkParsed([]); setBulkResult(null); setBulkError('') }}>
    <Upload className="mr-2 h-4 w-4" /> 일괄 운송장 등록
  </Button>
</div>
```

#### 8. 일괄 등록 다이얼로그 추가 (기존 Dialog 아래)
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

### Task 43 완료 조건

- [ ] `app/api/seller/orders/export/route.ts` — 헤더/rows에 주문ID(첫 번째 컬럼) 추가
- [ ] `app/api/seller/orders/tracking/bulk/route.ts` — POST 핸들러, 500건 상한, 셀러 소유 검증
- [ ] `app/seller/orders/page.tsx` — "일괄 운송장 등록" 버튼 + 다이얼로그 + CSV 파싱 로직
- [ ] 로컬 테스트: 템플릿 다운로드 → 데이터 입력 → 업로드 → 주문 목록 SHIPPING 전환 확인
- [ ] git commit + push

---

## 기술 규칙
- v1 코드 구조 유지 — 새 기능은 별도 디렉토리 (`app/api/kakao/`, `app/(buyer)/kakao/`)
- DB 변경은 Prisma migration
- 토큰 생성: `crypto.randomBytes(16).toString('hex')` (nanoid 없음, Node.js built-in)
- 카카오 오픈빌더 응답 타임아웃: 5초 → DB 조회는 최소화
- Cron 인증: `CRON_SECRET` Bearer (기존 settlements cron과 동일 방식)

---

## Vercel 배포 환경변수 체크리스트 (운영팀 전달용)

```
필수:
[ ] DATABASE_URL
[ ] NEXTAUTH_SECRET (32자 이상)
[ ] NEXTAUTH_URL (프로덕션 URL, 예: https://liveorder.vercel.app)
[ ] PORTONE_API_KEY
[ ] PORTONE_STORE_ID
[ ] PORTONE_API_SECRET (환불 필수)
[ ] BLOB_READ_WRITE_TOKEN (Vercel Blob)
[ ] CRON_SECRET (카카오 세션 정리 cron 인증)
[ ] RESEND_API_KEY (이메일 알림)
[ ] KAKAO_BOT_ID=69d6729b9fac321ddc6b5d64

프론트엔드 (NEXT_PUBLIC):
[ ] NEXT_PUBLIC_PORTONE_STORE_ID
[ ] NEXT_PUBLIC_PORTONE_CHANNEL_KEY

선택:
[ ] ADMIN_EMAIL (미설정 시 admin@liveorder.app 폴백)
[ ] PLATFORM_FEE_RATE (미설정 시 0.025)
[ ] SETTLEMENT_DELAY_DAYS (미설정 시 3)
```
