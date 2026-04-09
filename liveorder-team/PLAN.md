# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 46 완료 확인, Task 47 스펙 수립)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 47 작업 중) |
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

---

## Task 47 — 관리자 셀러 상세 페이지

### 배경

현재 관리자(`/admin/sellers`)는 셀러 목록만 볼 수 있고, 셀러 행을 클릭해도 아무 동작 없음.
운영자가 특정 셀러의 상품/코드/주문/정산 통계와 상세 정보를 한 눈에 확인하고 관리할 수 있어야 함.

### 목표

- 관리자가 셀러 행 클릭 → `/admin/sellers/[id]` 상세 페이지
- 셀러 기본정보 + 통계 카드 + 주문 목록
- 기존 승인/거부/정지 액션도 상세 페이지에서 가능

### 서브태스크

#### 47A: `GET /api/admin/sellers/[id]` — 기존 파일에 GET 핸들러 추가

**수정 파일:** `app/api/admin/sellers/[id]/route.ts`

> ⚠️ 주의: 이 파일에 이미 `PUT` 핸들러가 있음. PUT은 건드리지 말고 `GET` 핸들러만 추가.

```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const seller = await prisma.seller.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, repName: true,
      businessNo: true, phone: true, address: true,
      bankAccount: true, bankName: true, tradeRegNo: true,
      bizRegImageUrl: true, status: true, plan: true,
      emailVerified: true, createdAt: true,
    },
  })
  if (!seller) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

  const [productCount, codeCount, orderStats, pendingSettlement] = await Promise.all([
    prisma.product.count({ where: { sellerId: id, isActive: true } }),
    prisma.code.count({ where: { product: { sellerId: id }, isActive: true } }),
    prisma.order.aggregate({
      where: {
        code: { product: { sellerId: id } },
        status: { notIn: ['REFUNDED'] },
      },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.settlement.aggregate({
      where: { sellerId: id, status: 'PENDING' },
      _sum: { netAmount: true },
    }),
  ])

  return NextResponse.json({
    ...seller,
    stats: {
      productCount,
      codeCount,
      orderCount: orderStats._count.id,
      totalRevenue: orderStats._sum.amount ?? 0,
      pendingSettlement: pendingSettlement._sum.netAmount ?? 0,
    },
  })
}
```

**완료 조건:**
- [ ] 관리자 세션 없으면 401
- [ ] 없는 ID → 404
- [ ] stats 5개 필드 반환

---

#### 47B: `GET /api/admin/sellers/[id]/orders` 신규 생성

**파일 신규 생성:** `app/api/admin/sellers/[id]/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const status = searchParams.get('status') || undefined

  const where = {
    code: { product: { sellerId: id } },
    ...(status ? { status } : {}),
  }

  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id: true, buyerName: true, buyerPhone: true,
        quantity: true, amount: true, status: true,
        trackingNo: true, carrier: true, source: true, createdAt: true,
        code: { select: { codeKey: true, product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    data,
    pagination: { page, totalPages: Math.ceil(total / limit), total },
  })
}
```

**완료 조건:**
- [ ] 페이지네이션 동작
- [ ] status 필터 동작
- [ ] 빈 결과도 정상 반환 (404 아님)

---

#### 47C: `/admin/sellers/[id]` 페이지 신규 생성

**파일 신규 생성:** `app/admin/sellers/[id]/page.tsx`

**레이아웃:**
```
┌─────────────────────────────────────────────────────┐
│ ← 셀러 목록  |  [상호명]  [상태배지]  [승인/거부/정지] │
├─────────────────┬───────────────────────────────────┤
│ 셀러 기본 정보   │ 통계 카드 4개 (grid 2×2)            │
│ 이메일           │ [총 주문수]  [총 매출액]             │
│ 대표자명         │ [활성 상품]  [대기 정산액]           │
│ 사업자번호       │                                    │
│ 연락처           │                                    │
│ 주소             │                                    │
│ 정산계좌         │                                    │
│ 사업자등록증링크 │                                    │
├─────────────────┴───────────────────────────────────┤
│ 주문 목록                                             │
│ [전체] [PAID] [SHIPPING] [DELIVERED] [REFUNDED] 탭   │
│ 주문 테이블: 주문ID | 상품 | 구매자 | 금액 | 상태 | 날짜│
│ 페이지네이션                                          │
└─────────────────────────────────────────────────────┘
```

**구현 포인트:**
1. `useParams<{ id: string }>()` 로 셀러 ID 추출
2. `fetchSeller()` → `GET /api/admin/sellers/[id]`
3. `fetchOrders(page, statusFilter)` → `GET /api/admin/sellers/[id]/orders`
4. 상태 변경 버튼: `PUT /api/admin/sellers/[id]` 재사용 (기존 엔드포인트)
5. 상태 변경 후 `fetchSeller()` 재호출하여 배지 즉시 갱신
6. 통계 카드: `Card` 컴포넌트 사용, 숫자는 `toLocaleString()` 포맷
7. 사업자등록증: `bizRegImageUrl` 있으면 새 탭으로 열기 링크 표시
8. 주문 테이블 행 클릭 없음 (관리자 주문 상세는 미구현)
9. `AdminShell` 래핑 필수

**완료 조건:**
- [ ] 셀러 기본정보 전체 표시
- [ ] 사업자등록증 링크 표시 (있을 때만)
- [ ] 통계 카드 4개 정상 표시
- [ ] 주문 목록 + 페이지네이션 동작
- [ ] 상태 필터 탭 동작
- [ ] 승인/거부/정지 버튼 → 즉시 상태 반영

---

#### 47D: `/admin/sellers` 목록 행 클릭 연결

**수정 파일:** `app/admin/sellers/page.tsx`

**변경 내용:**
1. `useRouter` import 추가: `import { useRouter } from 'next/navigation'`
2. 컴포넌트 내 `const router = useRouter()` 추가
3. `TableRow`에 클릭 핸들러 + 커서 스타일 추가:
```tsx
<TableRow
  key={seller.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => router.push(`/admin/sellers/${seller.id}`)}
>
```

**완료 조건:**
- [ ] 셀러 행 클릭 시 `/admin/sellers/[id]`로 이동
- [ ] 마우스 커서가 pointer로 변경

---

## 남은 작업 (Task 47 이후)

| 우선순위 | 작업 | 비고 |
|----------|------|------|
| MEDIUM | 관리자 주문 상세 페이지 `/admin/orders/[id]` | 필요 시 |
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
│   │   ├── page.tsx         ✅ (47D 수정 예정)
│   │   └── [id]/page.tsx    ⬜ (Task 47C 신규)
│   ├── orders/page.tsx      ✅
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
    │   ├── sellers/[id]/route.ts         ✅ (PUT) → 47A GET 추가
    │   └── sellers/[id]/orders/route.ts  ⬜ (47B 신규)
    └── seller/orders/[id]/route.ts       ✅ (Task 46)
```
