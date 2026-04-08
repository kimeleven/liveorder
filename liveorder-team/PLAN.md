# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 40 완료 확인, Task 41~42 스펙 수립)_

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

### 현재 진행
- **Task 41**: 카카오 세션 일회성 보장 (보안) + CSV source 컬럼 추가
- **Task 42**: 셀러 대시보드 채널별 통계 (카카오 vs 웹)

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
                          ├→ GET /api/kakao/session/[token] 검증 + 즉시 삭제 ← Task 41 개선
                          ├→ sessionStorage pendingCode 저장
                          ├→ sessionStorage kakaoSource='true' 저장
                          └→ /chat redirect → 기존 결제 플로우

[PaymentSummary] → POST /api/payments/confirm
                          │
                          ├→ sessionStorage에서 kakaoSource 읽기
                          └→ body에 source: 'kakao' | 'web' 포함

[Vercel Cron 매일 03:00] → DELETE expired kakao_pay_sessions
[셀러 CSV 다운로드] → source 컬럼 포함 (웹/카카오) ← Task 41 추가
[셀러 대시보드] → 채널별 주문 비율 통계 ← Task 42 추가
```

---

## Phase 4: Task 41 상세 스펙

### 배경 / 문제

1. **보안**: 현재 `/api/kakao/session/[token]`은 검증만 하고 세션을 삭제하지 않음.
   동일 토큰으로 여러 번 접근 가능 → 일회성 토큰이 아님.
2. **CSV 누락**: 셀러 CSV 내보내기에 `source` 컬럼 없어 채널 분석 불가.

---

### Task 41A: 카카오 세션 일회성 처리

**파일 수정:** `app/api/kakao/session/[token]/route.ts`

현재 `findUnique` 후 응답만 반환. 세션 검증 성공 시 즉시 삭제 추가:

```typescript
// 세션 검증 성공 후 즉시 삭제 (일회성 토큰 보장)
await prisma.kakaoPaySession.delete({ where: { token } })
```

전체 수정 후 GET 핸들러 구조:
```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const session = await prisma.kakaoPaySession.findUnique({
    where: { token },
    include: {
      code: {
        include: { product: { include: { seller: true } } },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: '만료된 링크입니다.' }, { status: 410 })
  }

  // 일회성 토큰: 사용 즉시 삭제
  await prisma.kakaoPaySession.delete({ where: { token } })

  const { code } = session
  // ... 이하 기존 응답 로직 동일
}
```

**주의:** `delete` 실패 시(이미 삭제됨) → 이미 사용된 세션이므로 410 반환이 맞음.
`findUnique`와 `delete`를 트랜잭션으로 묶지 않아도 됨 (delete 실패 = 사용된 토큰).

---

### Task 41B: CSV 내보내기에 source 컬럼 추가

**파일 수정:** `app/api/seller/orders/export/route.ts`

1. `header` 문자열에 "주문경로" 컬럼 추가:
```typescript
const header = "주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로\n";
```

2. `rows` map에 source 컬럼 추가 (마지막):
```typescript
o.trackingNo ?? "",
o.source === 'kakao' ? '카카오' : '웹',  // ← 추가
```

3. prisma 쿼리에 `source: true` 추가 (현재 `include`만 있음, `select` 없으므로 자동 포함됨):
```typescript
// 현재 쿼리에서 order에 source가 자동 포함되지만 명시적으로 확인
// prisma.order.findMany에서 select 없이 include만 사용하므로 source 자동 포함
```

---

### Task 41 완료 조건

- [ ] `app/api/kakao/session/[token]/route.ts` — 검증 성공 후 `prisma.kakaoPaySession.delete` 추가
- [ ] `app/api/seller/orders/export/route.ts` — "주문경로" 헤더 + source 값 ('웹'/'카카오') 추가
- [ ] 로컬 테스트: `curl http://localhost:3000/api/kakao/session/[valid-token]` 두 번 호출 → 두 번째 410 확인
- [ ] git commit + push

---

## Phase 4: Task 42 상세 스펙

### 배경 / 목적

셀러가 대시보드에서 카카오 채널과 웹 직접 입력 주문의 비율을 한눈에 볼 수 있도록 통계 추가.
이미 `orders.source` 필드가 있으므로 API + UI만 추가.

---

### Task 42A: 셀러 대시보드 API에 채널별 통계 추가

**파일 수정:** `app/api/seller/dashboard/route.ts`

기존 응답에 `channelStats` 추가:

```typescript
// 채널별 주문 통계 (최근 30일)
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

const channelStats = await prisma.order.groupBy({
  by: ['source'],
  where: {
    code: { product: { sellerId: seller.id } },
    status: { notIn: ['REFUNDED'] },
    createdAt: { gte: thirtyDaysAgo },
  },
  _count: { id: true },
  _sum: { amount: true },
})

// 응답 형식으로 변환
const kakaoOrders = channelStats.find(s => s.source === 'kakao')
const webOrders = channelStats.find(s => s.source === 'web')

const channelSummary = {
  kakao: {
    count: kakaoOrders?._count.id ?? 0,
    amount: Number(kakaoOrders?._sum.amount ?? 0),
  },
  web: {
    count: webOrders?._count.id ?? 0,
    amount: Number(webOrders?._sum.amount ?? 0),
  },
}
```

기존 return 응답에 추가:
```typescript
return NextResponse.json({
  ...기존필드,
  channelStats: channelSummary,  // ← 추가
})
```

---

### Task 42B: 셀러 대시보드 UI에 채널 통계 카드 추가

**파일 수정:** `app/seller/dashboard/page.tsx`

기존 통계 카드 섹션 (매출, 주문 수, 처리 중 등) 아래에 "채널별 주문" 섹션 추가:

```tsx
{/* 채널별 주문 통계 */}
{stats.channelStats && (
  <div className="mt-6">
    <h2 className="text-sm font-medium text-muted-foreground mb-3">
      채널별 주문 (최근 30일)
    </h2>
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
            카카오
          </span>
          <span className="text-sm text-muted-foreground">채널</span>
        </div>
        <p className="text-2xl font-bold">{stats.channelStats.kakao.count}건</p>
        <p className="text-sm text-muted-foreground">
          {stats.channelStats.kakao.amount.toLocaleString()}원
        </p>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
            웹
          </span>
          <span className="text-sm text-muted-foreground">직접입력</span>
        </div>
        <p className="text-2xl font-bold">{stats.channelStats.web.count}건</p>
        <p className="text-sm text-muted-foreground">
          {stats.channelStats.web.amount.toLocaleString()}원
        </p>
      </Card>
    </div>
  </div>
)}
```

**타입 수정:** dashboard 데이터 타입에 `channelStats` 추가:
```typescript
channelStats?: {
  kakao: { count: number; amount: number }
  web: { count: number; amount: number }
}
```

---

### Task 42 완료 조건

- [ ] `app/api/seller/dashboard/route.ts` — `channelStats` 응답 추가
- [ ] `app/seller/dashboard/page.tsx` — 채널별 주문 카드 UI 추가
- [ ] 로컬 테스트: `curl -b session http://localhost:3000/api/seller/dashboard` → `channelStats` 포함 확인
- [ ] 대시보드 화면에서 카카오/웹 카드 표시 확인
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
