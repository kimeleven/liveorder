# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 47 완료 확인, Task 48 스펙 수립)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 48 작업 중) |
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

---

## Task 48 — 관리자 주문 상세 페이지

### 배경

현재 관리자(`/admin/orders`)는 주문 목록에서 행을 클릭해도 아무 동작 없음.
인라인 환불 버튼만 존재. 주문의 구매자 정보, 배송지, 셀러 정보를 한 번에 볼 방법이 없음.
Task 46(셀러 주문 상세)과 Task 47(관리자 셀러 상세) 동일 패턴으로 관리자용 주문 드릴다운 구현.

### 목표

- 관리자가 주문 행 클릭 → `/admin/orders/[id]` 상세 페이지
- 주문정보 + 구매자/배송지 + 셀러정보 + 배송정보 + 환불 버튼

### 서브태스크

---

#### 48A: `GET /api/admin/orders/[id]` — 신규 파일 생성

**파일 신규 생성:** `app/api/admin/orders/[id]/route.ts`

> ⚠️ 주의: 이 경로에 이미 `app/api/admin/orders/[id]/refund/route.ts`가 있음. `[id]` 폴더에 `route.ts`를 추가하는 것.

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

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      buyerName: true,
      buyerPhone: true,
      address: true,
      addressDetail: true,
      memo: true,
      quantity: true,
      amount: true,
      status: true,
      pgTid: true,
      trackingNo: true,
      carrier: true,
      source: true,
      createdAt: true,
      code: {
        select: {
          codeKey: true,
          product: {
            select: {
              name: true,
              price: true,
              seller: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(order)
}
```

**완료 조건:**
- [ ] 관리자 세션 없으면 401
- [ ] 없는 ID → 404
- [ ] seller.id, seller.name, seller.email, seller.phone 포함 반환
- [ ] 구매자 정보 전체 (buyerName, buyerPhone, address, addressDetail, memo) 반환

---

#### 48B: `/admin/orders/[id]` 페이지 신규 생성

**파일 신규 생성:** `app/admin/orders/[id]/page.tsx`

**레이아웃 (4섹션):**
```
┌─────────────────────────────────────────────────────┐
│ ← 주문 목록  |  주문 #XXXXXXXX  [상태배지]  [환불버튼] │
├─────────────────┬───────────────────────────────────┤
│ 주문 정보        │ 구매자 / 배송지                     │
│ 상품명           │ 구매자명                            │
│ 코드키           │ 연락처                              │
│ 수량             │ 주소 / 상세주소                     │
│ 결제금액         │ 메모 (있을 때만)                    │
│ 결제일시         │                                    │
│ PG 거래ID        │                                    │
│ 채널 (web/kakao) │                                    │
├─────────────────┼───────────────────────────────────┤
│ 셀러 정보        │ 배송 정보 (trackingNo 있을 때만)    │
│ 상호명 (링크)    │ 택배사                              │
│ 이메일           │ 운송장번호                          │
│ 연락처           │ 배송 추적 →                         │
└─────────────────┴───────────────────────────────────┘
```

**구현 포인트:**
1. `'use client'` + `useParams<{ id: string }>()`으로 ID 추출
2. `useEffect`로 `GET /api/admin/orders/${id}` 호출
3. 로딩 중: `로딩 중...` 텍스트, 에러 시 에러 메시지
4. 환불 버튼:
   - 조건: `['PAID', 'SHIPPING', 'DELIVERED'].includes(order.status)`
   - 기존 `RefundDialog` 컴포넌트 재사용 (`@/components/admin/RefundDialog`)
   - 환불 성공 후 `fetchOrder()` 재호출 → 상태 즉시 갱신
5. 셀러 상호명: `<Link href={'/admin/sellers/' + seller.id}>` 로 셀러 상세 링크
6. 배송 추적 URL: seller orders 상세 페이지와 동일한 `CARRIER_URLS` 매핑 사용
7. 채널 배지: `source === 'kakao'` 이면 `<Badge variant="secondary">카카오</Badge>` 추가
8. `AdminShell` 래핑 필수
9. 카드 레이아웃: `grid grid-cols-1 md:grid-cols-2 gap-4`

**CARRIER_URLS 매핑 (seller orders 상세와 동일):**
```typescript
const CARRIER_URLS: Record<string, string> = {
  'CJ대한통운': 'https://trace.cjlogistics.com/next/tracking.html?wblNo={trackingNo}',
  '로젠택배': 'https://www.logenpost.com/tracking/tracking.do?invoice={trackingNo}',
  '한진택배': 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038&schLang=KR&wblnumText2={trackingNo}',
  '롯데택배': 'https://www.lotteglogis.com/mobile/reservation/tracking/linkView?InvNo={trackingNo}',
  '우체국택배': 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?sid1={trackingNo}',
}
```

**완료 조건:**
- [ ] 주문 정보 전체 표시 (상품명, 코드, 수량, 금액, 결제일시, PG TID, 채널)
- [ ] 구매자/배송지 정보 전체 표시
- [ ] 셀러 정보 표시 + 셀러 상세 링크 동작
- [ ] 배송 정보 표시 (trackingNo 있을 때만)
- [ ] 환불 버튼 → RefundDialog 정상 동작 + 환불 후 상태 즉시 갱신
- [ ] `AdminShell` 래핑

---

#### 48C: `/admin/orders` 목록 행 클릭 연결

**수정 파일:** `app/admin/orders/page.tsx`

**변경 내용:**
1. `import { useRouter } from 'next/navigation'` 추가
2. 컴포넌트 내 `const router = useRouter()` 추가
3. `TableRow`에 클릭 핸들러 추가 + 환불 버튼 클릭 시 행 이동 방지:

```tsx
<TableRow
  key={order.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => router.push(`/admin/orders/${order.id}`)}
>
  {/* ... */}
  <TableCell onClick={(e) => e.stopPropagation()}>
    {canRefund && (
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-300 hover:bg-red-50"
        onClick={() => setRefundTarget({ ... })}
      >
        환불
      </Button>
    )}
  </TableCell>
</TableRow>
```

> ⚠️ 핵심: 환불 버튼이 있는 `TableCell`에 `onClick={(e) => e.stopPropagation()}` 추가 필수.
> 환불 버튼 클릭 시 상세 페이지로 이동하면 안 됨.

**완료 조건:**
- [ ] 주문 행 클릭 시 `/admin/orders/[id]`로 이동
- [ ] 환불 버튼 클릭 시 RefundDialog만 열리고 페이지 이동 없음
- [ ] 마우스 커서가 pointer로 변경

---

## 남은 작업 (Task 48 이후)

| 우선순위 | 작업 | 비고 |
|----------|------|------|
| LOW | 택배사 API 실시간 배송 추적 | 외부 API 연동 필요 |
| LOW | CS 티켓 관리 시스템 | Phase 3 이후 |
| LOW | 구매자 주문 이력 (선택적 회원가입) | Phase 4 |
| - | Vercel 배포 | 환경변수 설정만 필요 |

---

## 현재 파일 구조

```
app/
├── (buyer)/          # 구매자 플로우
├── admin/
│   ├── sellers/
│   │   ├── page.tsx         ✅ (47D 완료 — 행 클릭 연결)
│   │   └── [id]/page.tsx    ✅ (Task 47 완료)
│   ├── orders/
│   │   ├── page.tsx         ✅ → 48C 행 클릭 추가 예정
│   │   └── [id]/page.tsx    ⬜ (Task 48B 신규)
│   └── settlements/page.tsx ✅
├── seller/
│   ├── dashboard/page.tsx   ✅
│   ├── orders/
│   │   ├── page.tsx         ✅ (검색+자동갱신+상태필터)
│   │   └── [id]/page.tsx    ✅ (Task 46)
│   ├── settings/page.tsx    ✅ (Task 45)
│   └── ...
└── api/
    ├── admin/
    │   ├── sellers/[id]/route.ts                ✅ (GET+PATCH)
    │   ├── sellers/[id]/orders/route.ts         ✅ (Task 47B)
    │   ├── orders/route.ts                      ✅
    │   ├── orders/[id]/route.ts                 ⬜ (Task 48A 신규)
    │   └── orders/[id]/refund/route.ts          ✅
    └── seller/orders/[id]/route.ts              ✅ (Task 46)
```
