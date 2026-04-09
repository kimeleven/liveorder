# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Dev1 — Task 47 완료, Task 48 스펙 수립: 관리자 주문 상세 페이지)_

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

### Task 48: 관리자 주문 상세 페이지

**우선순위:** MEDIUM
**이유:** 현재 관리자 `/admin/orders`에서 주문 행 클릭 시 아무 동작 없음. 인라인 환불 버튼만 존재. 운영자가 주문의 구매자 정보, 배송지, 셀러 정보를 한 눈에 볼 수 없어 CS 대응 불편. Task 46(셀러 주문 상세), Task 47(관리자 셀러 상세)와 동일한 패턴으로 관리자 주문 드릴다운 페이지 구현.

---

#### 48A: `GET /api/admin/orders/[id]` — 신규 파일 생성

**파일 신규 생성:** `app/api/admin/orders/[id]/route.ts`

> ⚠️ 주의: `app/api/admin/orders/[id]/refund/route.ts`가 이미 존재함. `[id]` 폴더에 `route.ts`를 추가하는 것.

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
- [ ] 구매자 정보 전체 반환 (buyerName, buyerPhone, address, addressDetail, memo)

---

#### 48B: `/admin/orders/[id]` 페이지 신규 생성

**파일 신규 생성:** `app/admin/orders/[id]/page.tsx`

**레이아웃 (4카드):**
```
┌─────────────────────────────────────────────────────┐
│ ← 주문 목록  |  주문 #XXXXXXXX  [상태배지]  [환불버튼] │
├─────────────────┬───────────────────────────────────┤
│ 주문 정보        │ 구매자 / 배송지                     │
│ 상품명           │ 구매자명                            │
│ 코드키           │ 연락처                              │
│ 수량             │ 주소                                │
│ 결제금액         │ 상세주소 (있을 때만)                 │
│ 결제일시         │ 메모 (있을 때만)                    │
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
2. `useEffect`로 `GET /api/admin/orders/${id}` 호출, 에러/로딩 상태 처리
3. 환불 버튼:
   - 조건: `['PAID', 'SHIPPING', 'DELIVERED'].includes(order.status)`
   - 기존 `RefundDialog` 컴포넌트 재사용 (`@/components/admin/RefundDialog`)
   - 환불 성공 후 `fetchOrder()` 재호출 → 상태 즉시 갱신
4. 셀러 상호명: `<Link href={'/admin/sellers/' + seller.id}>` 로 셀러 상세 링크
   - `import Link from 'next/link'` 필요
5. 배송 추적 URL 매핑:
   ```typescript
   const CARRIER_URLS: Record<string, string> = {
     'CJ대한통운': 'https://trace.cjlogistics.com/next/tracking.html?wblNo={trackingNo}',
     '로젠택배': 'https://www.logenpost.com/tracking/tracking.do?invoice={trackingNo}',
     '한진택배': 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038&schLang=KR&wblnumText2={trackingNo}',
     '롯데택배': 'https://www.lotteglogis.com/mobile/reservation/tracking/linkView?InvNo={trackingNo}',
     '우체국택배': 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?sid1={trackingNo}',
   }
   ```
6. 채널 배지: `source === 'kakao'` 이면 `<Badge variant="secondary">카카오</Badge>` 추가
7. 상태 배지 variant 매핑:
   ```typescript
   const STATUS_BADGE = {
     PAID: { label: '결제완료', variant: 'default' },
     SHIPPING: { label: '배송중', variant: 'secondary' },
     DELIVERED: { label: '배송완료', variant: 'outline' },
     SETTLED: { label: '정산완료', variant: 'secondary' },
     REFUNDED: { label: '환불', variant: 'destructive' },
   }
   ```
8. `AdminShell` 래핑 필수
9. 카드 레이아웃: `grid grid-cols-1 md:grid-cols-2 gap-4`

**완료 조건:**
- [ ] 주문 정보 전체 표시 (상품명, 코드, 수량, 금액, 결제일시, PG TID, 채널)
- [ ] 구매자/배송지 정보 전체 표시
- [ ] 셀러 정보 표시 + 셀러 상세 링크 동작 (`/admin/sellers/[id]`)
- [ ] 배송 정보 표시 (trackingNo 있을 때만)
- [ ] 환불 버튼 → RefundDialog 정상 동작 + 환불 후 상태 즉시 갱신
- [ ] `AdminShell` 래핑 적용

---

#### 48C: `/admin/orders` 목록 행 클릭 연결

**수정 파일:** `app/admin/orders/page.tsx`

**변경 내용:**
1. `import { useRouter } from 'next/navigation'` 추가
2. 컴포넌트 내 `const router = useRouter()` 추가
3. `TableRow`에 클릭 핸들러 + 커서 스타일 추가
4. 환불 버튼이 있는 `TableCell`에 `e.stopPropagation()` 추가 (행 클릭과 분리)

```tsx
<TableRow
  key={order.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => router.push(`/admin/orders/${order.id}`)}
>
  {/* 다른 컬럼들 ... */}
  <TableCell onClick={(e) => e.stopPropagation()}>
    {canRefund && (
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-300 hover:bg-red-50"
        onClick={() =>
          setRefundTarget({
            id: order.id,
            amount: order.amount,
            buyerName: order.buyerName,
            productName: order.code.product.name,
          })
        }
      >
        환불
      </Button>
    )}
  </TableCell>
</TableRow>
```

**완료 조건:**
- [ ] 주문 행 클릭 시 `/admin/orders/[id]`로 이동
- [ ] 환불 버튼 클릭 시 RefundDialog만 열리고 페이지 이동 없음
- [ ] 마우스 커서가 pointer로 변경

---

#### 마무리

- [ ] `git add app/api/admin/orders/ app/admin/orders/`
- [ ] `git commit -m 'feat: Task 48 — 관리자 주문 상세 페이지 (48A~48C)'`
- [ ] `git push origin main`

---

## ✅ 완료된 작업

### Task 47: 관리자 셀러 상세 페이지 ✅

**완료일:** 2026-04-09

- [x] 47A: `GET /api/admin/sellers/[id]` — 기존 파일에 GET 핸들러 추가 (`app/api/admin/sellers/[id]/route.ts`)
- [x] 47B: `GET /api/admin/sellers/[id]/orders` 신규 생성 (`app/api/admin/sellers/[id]/orders/route.ts`)
- [x] 47C: `/admin/sellers/[id]` 페이지 신규 생성 (`app/admin/sellers/[id]/page.tsx`)
- [x] 47D: `/admin/sellers` 목록 행 클릭 → `router.push('/admin/sellers/' + id)` 연결

---

### Task 46: 셀러 주문 상세 페이지 + 주문 검색 ✅

**완료일:** 2026-04-09

- [x] 46A: `GET /api/seller/orders/[id]` — 셀러 소유 주문 상세 API (`app/api/seller/orders/[id]/route.ts`)
- [x] 46B: `GET /api/seller/orders` — `?q=` 검색 파라미터 추가 (구매자명/전화번호)
- [x] 46C: `/seller/orders/[id]` 상세 페이지 UI (`app/seller/orders/[id]/page.tsx`) — 주문정보/배송지/배송정보 3카드
- [x] 46D: `/seller/orders` 목록 행 클릭 → `router.push('/seller/orders/' + id)` 연결

---

### Task 45: 셀러 설정 페이지 ✅

- [x] 45A: `GET/PATCH /api/seller/me` — 전체 필드 조회/수정
- [x] 45B: `POST /api/seller/me/password` — 비밀번호 변경
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
