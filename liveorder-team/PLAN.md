# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 48 완료 확인, Task 49 스펙 수립)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 49 예정) |
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
| 47 | 관리자 셀러 상세 페이지 `/admin/sellers/[id]` + `GET /api/admin/sellers/[id]` + `GET /api/admin/sellers/[id]/orders` + 목록 행 클릭 연결 |
| 48 | 관리자 주문 상세 페이지 `/admin/orders/[id]` + `GET /api/admin/orders/[id]` + 목록 행 클릭 연결 |

---

## Task 49 — 관리자 정산 상세 페이지

### 배경

현재 관리자 `/admin/settlements` 정산 목록 페이지는 셀러명, 금액, 수수료, 상태만 표시하고, 행 클릭 시 아무 동작 없음.
운영자가 특정 정산 건에 어떤 주문들이 포함되어 있는지, 셀러 계좌 정보가 무엇인지 확인할 방법이 없음.
Task 46(셀러 주문 상세), 47(관리자 셀러 상세), 48(관리자 주문 상세)과 동일한 드릴다운 패턴으로 관리자 정산 상세 구현.

### 목표

- 관리자가 정산 행 클릭 → `/admin/settlements/[id]` 상세 페이지
- 정산 요약 + 셀러 정보 (계좌 포함) + 포함 주문 목록 표시
- 정산 완료 처리 버튼 (PENDING → COMPLETED 수동 전환)

### 서브태스크

---

#### 49A: `GET /api/admin/settlements/[id]` — 신규 파일 생성

**파일 신규 생성:** `app/api/admin/settlements/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const settlement = await prisma.settlement.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      fee: true,
      pgFee: true,
      netAmount: true,
      status: true,
      scheduledAt: true,
      settledAt: true,
      createdAt: true,
      seller: {
        select: {
          id: true,
          name: true,
          businessNo: true,
          email: true,
          phone: true,
          bankName: true,
          bankAccount: true,
        },
      },
      orders: {
        select: {
          id: true,
          buyerName: true,
          buyerPhone: true,
          quantity: true,
          amount: true,
          status: true,
          source: true,
          createdAt: true,
          code: {
            select: {
              codeKey: true,
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!settlement) {
    return NextResponse.json({ error: '정산 건을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(settlement)
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const settlement = await prisma.settlement.findUnique({ where: { id } })
  if (!settlement) {
    return NextResponse.json({ error: '정산 건을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (settlement.status !== 'PENDING') {
    return NextResponse.json({ error: '대기 중인 정산만 완료 처리할 수 있습니다.' }, { status: 400 })
  }

  const updated = await prisma.settlement.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      settledAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}
```

**완료 조건:**
- [ ] 관리자 세션 없으면 401
- [ ] 없는 ID → 404
- [ ] seller 정보 (id, name, businessNo, email, phone, bankName, bankAccount) 포함 반환
- [ ] 포함 주문 목록 (id, buyerName, quantity, amount, status, source, createdAt, code.codeKey, product.name) 반환
- [ ] PATCH: PENDING → COMPLETED 전환 (settledAt = now)
- [ ] PATCH: 이미 COMPLETED면 400

---

#### 49B: `/admin/settlements/[id]` 페이지 신규 생성

**파일 신규 생성:** `app/admin/settlements/[id]/page.tsx`

**레이아웃 (3카드 + 1테이블):**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← 정산 목록  |  정산 #XXXXXXXX  [상태배지]  [완료처리버튼(PENDING시)]│
├──────────────────────┬──────────────────────────────────────────┤
│ 정산 요약             │ 셀러 정보                                  │
│ 거래금액              │ 상호명 (셀러 상세 링크)                     │
│ 플랫폼 수수료 (2.5%)  │ 사업자번호                                  │
│ PG 수수료             │ 이메일                                      │
│ 실지급액              │ 연락처                                      │
│ 정산예정일            │ 정산 계좌 (은행명 + 계좌번호)               │
│ 정산완료일 (있을 때)  │                                            │
├──────────────────────┴──────────────────────────────────────────┤
│ 포함 주문 목록 (N건)                                              │
│ 주문번호 | 상품명 | 코드키 | 구매자 | 수량 | 금액 | 채널 | 주문일  │
│ [행 클릭 → /admin/orders/[id]]                                   │
└─────────────────────────────────────────────────────────────────┘
```

**구현 포인트:**
1. `'use client'` + `useParams<{ id: string }>()`으로 ID 추출
2. `useEffect`로 `GET /api/admin/settlements/${id}` 호출, 에러/로딩 상태 처리
3. 정산 완료 처리 버튼:
   - 조건: `settlement.status === 'PENDING'`
   - 클릭 시 `PATCH /api/admin/settlements/${id}` 호출
   - 성공 후 `fetchSettlement()` 재호출 → 상태 즉시 갱신
   - 버튼 텍스트: "정산 완료 처리"
4. 셀러 상호명: `<Link href={'/admin/sellers/' + seller.id}>` 링크
5. 정산 계좌: `bankName ? ${bankName} ${bankAccount} : '미등록'`
6. 포함 주문 테이블 행 클릭: `router.push('/admin/orders/' + order.id)`
7. 상태 배지 매핑:
   ```typescript
   const STATUS_BADGE = {
     PENDING: { label: '대기중', variant: 'secondary' },
     COMPLETED: { label: '완료', variant: 'default' },
     FAILED: { label: '실패', variant: 'destructive' },
   }
   ```
8. 채널 배지: `source === 'kakao'` → `<Badge variant="secondary">카카오</Badge>`
9. `AdminShell` 래핑 필수
10. 카드 레이아웃: `grid grid-cols-1 md:grid-cols-2 gap-4`

**완료 조건:**
- [ ] 정산 요약 전체 표시 (거래금액, 수수료, PG수수료, 실지급액, 예정일, 완료일)
- [ ] 셀러 정보 표시 (상호명 링크 포함, 정산 계좌)
- [ ] 포함 주문 목록 테이블 + 행 클릭 → `/admin/orders/[id]`
- [ ] PENDING 상태에서만 "정산 완료 처리" 버튼 표시
- [ ] 완료 처리 후 상태 즉시 갱신 (재조회)
- [ ] `AdminShell` 래핑 적용

---

#### 49C: `/admin/settlements` 목록 행 클릭 연결

**수정 파일:** `app/admin/settlements/page.tsx`

**변경 내용:**
1. `import { useRouter } from 'next/navigation'` 추가
2. 컴포넌트 내 `const router = useRouter()` 추가
3. `TableRow`에 클릭 핸들러 + 커서 스타일 추가:

```tsx
<TableRow
  key={s.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => router.push(`/admin/settlements/${s.id}`)}
>
  {/* 기존 컬럼들 */}
</TableRow>
```

4. "정산 배치 실행" `Button`의 `onClick`이 있으므로 행 클릭과 충돌 없음 (버튼은 TableRow 밖)

**완료 조건:**
- [ ] 정산 행 클릭 시 `/admin/settlements/[id]`로 이동
- [ ] 마우스 커서가 pointer로 변경

---

## Task 50 예고 — 관리자 대시보드 개선

현재 관리자 대시보드는 숫자 통계 카드 4개만 존재. 셀러 대시보드처럼 매출 추이 차트 + 빠른 링크 추가 예정.

### 구현 예정 내용

1. **일별 매출 차트 (7일)** — `recharts` LineChart, `GET /api/admin/dashboard`에 `dailySales` 추가
2. **승인 대기 셀러 목록** — 최근 5건, 클릭 → `/admin/sellers/[id]`
3. **최근 주문 목록** — 최근 5건, 클릭 → `/admin/orders/[id]`
4. **통계 카드 개선** — 오늘 매출 / 이번 달 매출 분리

---

*최종 업데이트: 2026-04-09 (Planner)*
