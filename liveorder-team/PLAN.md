# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 39 완료 반영, Task 40 스펙 수립)_

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

### 현재 진행
- **Task 40**: 주문 소스 추적 (`source: 'web' | 'kakao'`) — 셀러가 카카오 경로 주문 식별

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
                          ├→ GET /api/kakao/session/[token] 검증
                          ├→ sessionStorage pendingCode 저장
                          ├→ sessionStorage kakaoSource='true' 저장 ← Task 40 추가
                          └→ /chat redirect → 기존 결제 플로우

[PaymentSummary] → POST /api/payments/confirm
                          │
                          ├→ sessionStorage에서 kakaoSource 읽기 ← Task 40 추가
                          └→ body에 source: 'kakao' | 'web' 포함 ← Task 40 추가

[Vercel Cron 매일 03:00] → DELETE expired kakao_pay_sessions
```

---

## Phase 4: Task 40 상세 스펙

### 배경 / 문제

현재 카카오 채널을 통해 들어온 주문과 웹 직접 입력 주문이 `Order` 테이블에서 구분되지 않음.
셀러가 주문 목록에서 "카카오 채널 주문"을 식별할 수 없어 CS/분석에 불편함.

---

### Task 40A: DB 스키마 변경 — `source` 필드 추가

**파일 수정:** `prisma/schema.prisma`

`Order` 모델에 추가:
```prisma
source    String   @default("web") @map("source") @db.VarChar(10) // 'web' | 'kakao'
```

전체 `Order` 모델 변경 후 (기존 필드 중간에 삽입):
```prisma
model Order {
  id            String      @id @default(uuid()) @db.Uuid
  codeId        String      @map("code_id") @db.Uuid
  settlementId  String?     @map("settlement_id") @db.Uuid
  buyerName     String      @map("buyer_name") @db.VarChar(50)
  buyerPhone    String      @map("buyer_phone") @db.VarChar(20)
  address       String
  addressDetail String?     @map("address_detail")
  memo          String?
  quantity      Int         @default(1)
  amount        Int
  status        OrderStatus @default(PAID)
  source        String      @default("web") @map("source") @db.VarChar(10)  // ← 추가
  pgTid         String?     @unique @map("pg_tid") @db.VarChar(100)
  trackingNo    String?     @map("tracking_no") @db.VarChar(50)
  carrier       String?     @db.VarChar(30)
  createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamptz
  ...
}
```

**마이그레이션 실행:**
```bash
npx prisma migrate dev --name add_order_source
```

---

### Task 40B: 카카오 진입 페이지에 소스 플래그 저장

**파일 수정:** `app/(buyer)/kakao/[token]/page.tsx`

`sessionStorage.setItem('pendingCode', ...)` 직후에 추가:
```typescript
sessionStorage.setItem('kakaoSource', 'true')
router.replace('/chat')
```

전체 `.then(data => ...)` 블록:
```typescript
.then((data) => {
  if (!data.valid) {
    setError(data.error || '유효하지 않은 링크입니다.')
    return
  }
  sessionStorage.setItem(
    'pendingCode',
    JSON.stringify({ code: data.code.codeKey, data })
  )
  sessionStorage.setItem('kakaoSource', 'true')  // ← 추가
  router.replace('/chat')
})
```

---

### Task 40C: 결제 확인 컴포넌트에서 소스 전송

**파일 수정:** `components/buyer/cards/PaymentSummary.tsx`

`handlePayment()` 내 `fetch("/api/payments/confirm", ...)` body에 `source` 추가:
```typescript
// sessionStorage에서 카카오 소스 플래그 읽기
const source = sessionStorage.getItem('kakaoSource') === 'true' ? 'kakao' : 'web'

const res = await fetch("/api/payments/confirm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    portonePaymentId,
    codeId: currentFlow?.codeId,
    buyerName: address.buyerName,
    buyerPhone: address.buyerPhone,
    address: address.address,
    addressDetail: address.addressDetail,
    memo: address.memo,
    quantity: data.quantity,
    amount: totalAmount,
    source,  // ← 추가
  }),
});
```

**주의:** `source` 읽는 코드는 `handlePayment()` 함수 내부 try 블록 진입 직후, `portonePaymentId` 생성 전에 위치시킬 것.

---

### Task 40D: 결제 확인 API에서 source 저장

**파일 수정:** `app/api/payments/confirm/route.ts`

1. `body` 구조분해에 `source` 추가:
```typescript
const {
  portonePaymentId,
  codeId,
  buyerName,
  buyerPhone,
  address,
  addressDetail,
  memo,
  quantity,
  amount,
  source,  // ← 추가
} = body;
```

2. `tx.order.create` data에 `source` 추가:
```typescript
const newOrder = await tx.order.create({
  data: {
    codeId,
    buyerName,
    buyerPhone,
    address,
    addressDetail,
    memo,
    quantity: Number(quantity),
    amount: Number(amount),
    status: "PAID",
    pgTid: portonePaymentId,
    source: source === 'kakao' ? 'kakao' : 'web',  // ← 추가 (유효성 검증)
  },
});
```

---

### Task 40E: 셀러 주문 API에 source 포함

**파일 수정:** `app/api/seller/orders/route.ts`

주문 조회 `select` 블록에 `source: true` 추가:
```typescript
select: {
  id: true,
  buyerName: true,
  buyerPhone: true,
  quantity: true,
  amount: true,
  status: true,
  source: true,  // ← 추가
  trackingNo: true,
  carrier: true,
  createdAt: true,
  code: {
    select: {
      codeKey: true,
      product: { select: { name: true } },
    },
  },
},
```

---

### Task 40F: 셀러 주문 목록 UI에 카카오 배지 표시

**파일 수정:** `app/seller/orders/page.tsx`

1. `OrderItem` 인터페이스에 `source` 추가:
```typescript
interface OrderItem {
  id: string;
  buyerName: string;
  buyerPhone: string;
  quantity: number;
  amount: number;
  status: string;
  source: string;  // ← 추가
  trackingNo: string | null;
  carrier: string | null;
  createdAt: string;
  code: { codeKey: string; product: { name: string } };
}
```

2. 주문 목록 테이블의 주문자명 셀에 배지 추가:
```tsx
<TableCell>
  <div className="flex items-center gap-1.5">
    {order.source === 'kakao' && (
      <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-yellow-100 text-yellow-800 border-yellow-200">
        카카오
      </Badge>
    )}
    {order.buyerName}
  </div>
</TableCell>
```

---

### Task 40 완료 조건

```bash
# 1. 마이그레이션 확인
npx prisma migrate status
# 응답: "Database schema is up to date!"

# 2. 스키마 확인 (orders 테이블에 source 컬럼 존재)
psql -U a1111 -d liveorder -c "\d orders"
# source 컬럼 확인

# 3. 웹 주문 테스트 (source = 'web')
# 브라우저에서 코드 직접 입력 → 결제 완료 후 DB 확인
psql -U a1111 -d liveorder -c "SELECT id, source FROM orders ORDER BY created_at DESC LIMIT 3;"
# source = 'web'

# 4. 카카오 플로우 시뮬레이션 (source = 'kakao')
# /kakao/[valid-token] 접속 → /chat 리다이렉트 → 결제 완료 후 DB 확인
# source = 'kakao'

# 5. 셀러 주문 목록 API 확인
curl -b "cookie-from-seller-session" http://localhost:3000/api/seller/orders
# 응답 orders[].source 필드 포함 확인
```

---

## Task 41 (다음 단계 예정): Vercel 배포 + 카카오 연동 환경변수

### 배경
v3 카카오 챗봇 기능이 완성됐으나 Vercel 배포에 카카오 관련 환경변수 미설정.

### 작업 내용
1. `KAKAO_BOT_ID=69d6729b9fac321ddc6b5d64` — Vercel 환경변수 설정
2. `CRON_SECRET` — Vercel 환경변수 설정 (세션 정리 cron 인증)
3. `NEXTAUTH_URL` — 프로덕션 URL 설정 (카카오 결제 URL 생성에 필수)
4. `docs/kakao-openbuilder-setup.md` 문서 기반으로 오픈빌더 스킬 서버 URL 등록

---

## 기술 규칙
- v1 코드 구조 유지 — 새 기능은 별도 디렉토리 (`app/api/kakao/`, `app/(buyer)/kakao/`)
- DB 변경은 Prisma migration
- 토큰 생성: `crypto.randomBytes(16).toString('hex')` (nanoid 없음, Node.js built-in)
- 카카오 오픈빌더 응답 타임아웃: 5초 → DB 조회는 최소화
- Cron 인증: `CRON_SECRET` Bearer (기존 settlements cron과 동일 방식)
