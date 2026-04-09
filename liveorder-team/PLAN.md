# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 53 완료 확인, Task 54 스펙 수립: 셀러 상품 상세 페이지)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 54 예정) |
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
| 49 | 관리자 정산 상세 페이지 `/admin/settlements/[id]` + `GET/PATCH /api/admin/settlements/[id]` + 목록 행 클릭 연결 |
| 50 | 관리자 대시보드 개선 — 매출 차트 + 승인 대기 셀러 + 최근 주문 + 통계 카드 6개 |
| 51 | 관리자 셀러 승인 즉시 처리 UX 개선 — 로딩 상태 + 토스트 알림 + confirm 다이얼로그 |
| 52 | 관리자 상품/코드 관리 페이지 `/admin/products` + `GET/PATCH /api/admin/products` + 사이드바 메뉴 추가 |
| 53 | 셀러 코드 상세 페이지 `/seller/codes/[id]` + `GET /api/seller/codes/[id]` (코드 상세+주문목록+통계) + 코드 목록 행 클릭 연결 |

---

## Task 54 — 셀러 상품 상세 페이지

### 배경

현재 셀러의 상품 목록(`/seller/products`)은 카드 그리드 형태로 구현되어 있으며,
카드 클릭 시 아무 동작이 없고 수정/삭제 버튼만 제공된다.

- `/seller/products/[id]` 상세 페이지 없음 (edit 페이지만 존재)
- `GET /api/seller/products/[id]` 기본 정보만 반환 (코드 목록, 통계 없음)
- 셀러가 상품별 코드 발급 현황, 주문 통계를 한 눈에 볼 방법 없음

### 목표

- 상품 카드 클릭 → 상품 상세 페이지 이동
- 상품 정보 + 코드 목록 + 주문 통계 한 화면에 표시
- 코드 행 클릭 → 코드 상세 페이지 (`/seller/codes/[id]`) 연결
- "수정" 버튼 → 상품 수정 페이지 (`/seller/products/[id]/edit`) 연결
- "코드 추가" 버튼 → 코드 발급 페이지 연결

### 레이아웃

```
/seller/products/[id] (상품 상세)
┌──────────────────────────────────────────────────────────┐
│ ← 상품 목록     상품명   [판매중 배지]   [수정 버튼]        │
├────────────────────┬─────────────────────────────────────┤
│ 상품 이미지         │ 카테고리 | 가격 | 재고 | 등록일       │
│ (없으면 placeholder)│ 설명(있으면)                        │
└────────────────────┴─────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ 총 주문 수  │  총 매출  │  활성 코드 수                    │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ 발급된 코드              [코드 추가 버튼]                  │
│ 코드 | 주문수 | 만료일 | 최대/사용 | 상태                  │
│ [행 클릭 → /seller/codes/[id]]                           │
└──────────────────────────────────────────────────────────┘
```

### 서브태스크

---

#### 54A: `GET /api/seller/products/[id]` 확장

**수정 파일:** `app/api/seller/products/[id]/route.ts`

기존 GET 핸들러를 확장 (PUT, DELETE는 유지):

```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const product = await prisma.product.findFirst({
    where: { id, sellerId: session.user.id },
    include: {
      codes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          codeKey: true,
          isActive: true,
          expiresAt: true,
          maxQty: true,
          usedQty: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      },
    },
  })

  if (!product)
    return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })

  // 상품 전체 주문 통계 (REFUNDED 제외)
  const statsAgg = await prisma.order.aggregate({
    where: { code: { productId: id }, status: { not: 'REFUNDED' } },
    _sum: { amount: true },
    _count: { id: true },
  })

  return NextResponse.json({
    ...product,
    stats: {
      totalOrders: statsAgg._count.id,
      totalRevenue: statsAgg._sum.amount ?? 0,
      activeCodeCount: product.codes.filter((c) => c.isActive).length,
    },
  })
}
```

**완료 조건:**
- [ ] 본인 상품만 조회 가능 (타 셀러 → 404)
- [ ] codes 배열 (id, codeKey, isActive, expiresAt, maxQty, usedQty, _count.orders)
- [ ] stats: totalOrders, totalRevenue (REFUNDED 제외), activeCodeCount
- [ ] 기존 PUT/DELETE 핸들러 유지

---

#### 54B: `/seller/products/[id]` 상세 페이지 신규 생성

**신규 파일:** `app/seller/products/[id]/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SellerShell from '@/components/seller/SellerShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ChevronLeft, Pencil, Plus } from 'lucide-react'

// 타입 정의
interface CodeItem {
  id: string
  codeKey: string
  isActive: boolean
  expiresAt: string
  maxQty: number
  usedQty: number
  createdAt: string
  _count: { orders: number }
}

interface ProductDetail {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  category: string
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  codes: CodeItem[]
  stats: { totalOrders: number; totalRevenue: number; activeCodeCount: number }
}

function getCodeStatus(code: CodeItem) {
  if (!code.isActive) return { label: '중지', variant: 'secondary' as const }
  if (new Date(code.expiresAt) < new Date()) return { label: '만료', variant: 'destructive' as const }
  if (code.maxQty > 0 && code.usedQty >= code.maxQty) return { label: '소진', variant: 'outline' as const }
  return { label: '활성', variant: 'default' as const }
}
```

**UI 세부:**
- 헤더: `← 상품 목록` + 상품명 + 판매중/중지 Badge + `수정` 버튼
- 상품 정보 카드: 이미지(있으면)/placeholder + 카테고리/가격/재고/설명/등록일
  - 이미지: `<img src={imageUrl} className="w-full max-h-48 object-contain rounded" />`
  - 없으면: `<div className="w-full h-32 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">이미지 없음</div>`
- 통계 카드: `grid grid-cols-1 sm:grid-cols-3 gap-4`
- 코드 목록 테이블:
  - CardHeader에 "발급된 코드" + `<Button size="sm" onClick={() => router.push('/seller/codes/new')}><Plus /> 코드 추가</Button>`
  - 컬럼: 코드(font-mono text-sm) | 주문수 | 만료일 | 사용/최대(0이면 "무제한") | 상태
  - 행 클릭: `router.push('/seller/codes/' + code.id)`
  - 비활성 코드: `className={code.isActive ? '' : 'opacity-60'}`
  - 빈 상태: "발급된 코드가 없습니다. 코드를 발급하면 이 상품으로 주문을 받을 수 있습니다."
- Skeleton (코드 테이블 로딩 중): 3행 × `<Skeleton className="h-10 w-full" />`

**완료 조건:**
- [ ] 상품 정보 카드 (이미지/placeholder, 카테고리, 가격, 재고, 설명, 등록일)
- [ ] 통계 3개 카드 (총주문/총매출/활성코드수)
- [ ] 코드 목록 테이블 (행 클릭 → /seller/codes/[id])
- [ ] Skeleton 로딩
- [ ] 빈 상태 메시지
- [ ] 수정 버튼 → /seller/products/[id]/edit
- [ ] 코드 추가 버튼 → /seller/codes/new

---

#### 54C: `/seller/products` 목록 카드 클릭 → 상세 연결

**수정 파일:** `app/seller/products/page.tsx`

현재 카드 그리드 형태. 카드 전체를 클릭하면 상세로 이동:

```typescript
<Card
  key={product.id}
  className="hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => router.push(`/seller/products/${product.id}`)}
>
  ...
  {/* 수정 버튼 */}
  <Button
    size="sm"
    variant="outline"
    className="flex-1"
    onClick={(e) => { e.stopPropagation(); router.push(`/seller/products/${product.id}/edit`) }}
  >
  ...
  {/* 삭제 버튼 */}
  <Button
    size="sm"
    variant="outline"
    className="flex-1 text-destructive hover:text-destructive"
    onClick={(e) => { e.stopPropagation(); setDeleteTarget(product) }}
  >
```

**완료 조건:**
- [ ] 카드 클릭 시 `/seller/products/[id]` 이동
- [ ] 수정/삭제 버튼 클릭 시 카드 onClick 버블링 방지 (`e.stopPropagation()`)

---

### 구현 순서

54A → 54B → 54C

---

*최종 업데이트: 2026-04-09 (Planner)*
