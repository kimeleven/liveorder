# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 55 완료 확인, Task 56 스펙 수립: 셀러 상품 활성/비활성 토글 + 비활성 목록 필터)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 56 진행) |
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
| 55 | 셀러 코드 편집/삭제 — `PATCH /api/seller/codes/[id]` + `DELETE /api/seller/codes/[id]` + 편집 다이얼로그 + 삭제 버튼 |

---

## Task 56 — 셀러 상품 활성/비활성 토글 + 비활성 상품 목록 표시

### 배경

현재 셀러 상품 관리에 아래 문제가 있다:

1. **비활성화된 상품 재활성화 불가**: 상품 목록 API(`GET /api/seller/products`)가 `isActive: true`만 반환 → 비활성화 후 목록에서 사라지면 재활성화 방법 없음
2. **상품 상세 페이지에 토글 없음**: 코드 상세(`/seller/codes/[id]`)에는 활성/비활성 토글이 있지만, 상품 상세(`/seller/products/[id]`)에는 수정 버튼만 있고 토글 버튼이 없음
3. **삭제 = 영구 삭제처럼 동작**: `DELETE /api/seller/products/[id]`는 soft-delete(isActive=false)이지만, 목록에서 사라지므로 셀러 입장에서는 복구 불가

코드 toggle 패턴(`POST /api/seller/codes/[id]/toggle`)을 상품에도 적용하는 것이 일관성 있는 UX.

### 목표

- 상품 목록에서 상태 필터(활성/비활성/전체)로 비활성 상품도 확인 가능
- 상품 목록 각 카드에서 바로 활성화/중지 전환 가능
- 상품 상세 페이지에서도 "판매 중지" / "판매 재개" 버튼으로 토글 가능

### 레이아웃 변경

```
/seller/products
┌──────────────────────────────────────────────┐
│ 내 상품  [+ 상품 등록]                          │
│ [활성] [비활성] [전체]   ← 신규 필터 탭          │
├──────────────────────────────────────────────┤
│ [상품카드] [상품카드] [상품카드]                  │
│           각 카드에 [수정] [중지/활성화] 버튼     │
└──────────────────────────────────────────────┘

/seller/products/[id]
┌──────────────────────────────────────────────┐
│ ← 상품 목록  상품명  [판매중 배지]              │
│             [판매 중지/재개] [수정] ← 토글 버튼  │
├──────────────────────────────────────────────┤
│ (기존) 상품정보 카드 / 통계 / 코드 테이블         │
└──────────────────────────────────────────────┘
```

### 서브태스크

#### 56A: `POST /api/seller/products/[id]/toggle`

**신규 파일:** `app/api/seller/products/[id]/toggle/route.ts`

코드 toggle과 동일한 패턴:
- 본인 상품 여부 확인 (`sellerId: session.user.id`)
- isActive 반전 후 반환 (`{ isActive: boolean }`)

#### 56B: `GET /api/seller/products` — `?status` 필터

**수정 파일:** `app/api/seller/products/route.ts`

```
?status=active   (기본) → isActive: true
?status=inactive         → isActive: false
?status=all              → 필터 없음 (전체)
```

기존 `isActive: true` 하드코딩 제거, status 파라미터로 분기.

#### 56C: `/seller/products` 목록 — 필터 탭 + 토글 버튼

**수정 파일:** `app/seller/products/page.tsx`

- `statusFilter` 상태 추가 (기본: `'active'`)
- 필터 탭 버튼 3개 (활성/비활성/전체)
- `fetchProducts`에 `?status=${statusFilter}` 추가
- 각 카드에 토글 버튼 추가 + 비활성 상품 opacity-60 처리

#### 56D: `/seller/products/[id]` 상세 — 토글 버튼

**수정 파일:** `app/seller/products/[id]/page.tsx`

- 기존 useEffect fetch → `fetchProduct` useCallback으로 추출
- 헤더에 "판매 중지" / "판매 재개" 버튼 (product.isActive 기준)
- 토글 성공 시 fetchProduct 재호출

### 구현 순서

56A (신규) → 56B (기존 파일 수정) → 56C → 56D

---

*최종 업데이트: 2026-04-09 (Planner)*
