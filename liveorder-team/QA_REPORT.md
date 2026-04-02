# LIVEORDER QA 리포트

> 최종 업데이트: 2026-04-03 (QA — Task 21/22 코드 검증, 신규 버그 1개 발견)
> QA 단계: Phase 3 진행 중 — P3-0/P3-1 완료 검증

---

## 핵심 플로우 상태

| 단계 | 플로우 | 상태 | 비고 |
|------|--------|------|------|
| SELLER | 회원가입 → 사업자 인증 | ✅ | 관리자 승인 후 APPROVED 전환 |
| SELLER | 상품 등록 → 코드 자동 발급 (UX-1) | ✅ | autoCode 반환 + 성공 화면 표시 |
| SELLER | 코드 발급 페이지 QR 코드 (UX-2) | ✅ | `qrcode` 설치, 발급 성공 화면 QR 표시 + `/order/[code]` 라우트 |
| SELLER | 코드 발급 드롭다운 상품명 표시 (UX-3) | ✅ | shadcn SelectItem children 자동 표시 |
| SELLER | 코드 API 보안 | ✅ | `/api/seller/codes` 정상 |
| SELLER | 상품 수정/삭제 | ✅ | Soft delete 정상 |
| SELLER | 상품 이미지 업로드 | ✅ | Vercel Blob 연동, 5MB/image/* 제한 |
| SELLER | 주문 목록 페이지네이션 | ✅ | P3-1 완료 — `{ data, pagination }` 형식 |
| SELLER | 상품 목록 페이지네이션 | ✅ | P3-1 완료 |
| SELLER | 코드 목록 페이지네이션 | ✅ | P3-1 완료 |
| BUYER | 코드 입력 → 상품 확인 | ✅ | 랜딩 + 채팅 플로우 |
| BUYER | 결제 (PortOne) | ✅ | 서버 검증 완료, 금액 대조 |
| BUYER | 배송지 입력 + 개인정보 동의 | ✅ | 체크박스 미체크 시 제출 불가 |
| BUYER | 주문 조회 (비회원) | ✅ | 전화번호 + 주문번호 |
| SELLER | 주문 확인 → 배송지 CSV | ✅ | UTF-8 BOM, CSV 다운로드 |
| SELLER | 운송장 등록 | ✅ | Dialog UI, PAID/SHIPPING 상태 |
| SELLER | 배송완료 상태 (DELIVERED) | ✅ | enum + 마이그레이션 완료 |
| SELLER | 정산 조회 + 상세 드릴다운 | ✅ | SettlementDetailDrawer — 에러 처리 포함 |
| ADMIN | 셀러 승인/거부/정지 | ✅ | 감사 로그 포함 |
| ADMIN | 정산 처리 (크론 + 수동) | ✅ | CRON_SECRET 인증, B-16 수정 완료 |
| ADMIN | 주문 목록 + 환불 UI | ✅ | RefundDialog + API 정상 (단, 배포 환경변수 주의) |
| ADMIN | 주문 목록 로딩 상태 | ✅ | P3-0 완료 — Skeleton 컴포넌트 적용 |

---

## 정상 동작 확인

### P3-0 기술 부채 클린업 (Task 21) — 전체 수정 확인 ✅

- **SettlementDetailDrawer 에러 처리:** `components/seller/SettlementDetailDrawer.tsx:83-87` — `.catch(() => {})` → `console.error` + `setError()` + 에러 메시지 렌더링 (`{!loading && error && <p>...</p>}`) ✅
- **admin/orders 로딩 상태:** `app/admin/orders/page.tsx:63,71-72` — `isLoading` state + `fetchOrders()` 내부 `setIsLoading(true)` 호출로 필터 변경 시에도 로딩 상태 정상 표시 + Skeleton 컴포넌트 ✅
- **RefundDialog 상태 초기화:** `components/admin/RefundDialog.tsx:82-88` — `handleClose()` 함수 내 `reason`, `partialAmount`, `error` 초기화 후 `onClose()` 호출. 성공 경로(line 70-74)도 동일하게 상태 초기화 ✅
- **buyer-store 타입 안전성:** `stores/buyer-store.ts:34-56` — `FlowProduct`, `FlowSeller`, `FlowAddress` 명시적 인터페이스 정의. `chat/page.tsx`에서 임포트하여 사용 ✅

### P3-1 API 페이지네이션 (Task 22) — 셀러 API 3개 완료 ✅

- **lib/pagination.ts:** `parsePagination()` (page/limit/skip 파싱, limit 최대 100 제한) + `buildPaginationResponse()` (`{ data, pagination: { page, limit, total, totalPages, hasNext, hasPrev } }`) ✅
- **seller/orders API:** `app/api/seller/orders/route.ts:4,13,34` — `parsePagination` + `buildPaginationResponse` 적용 ✅
- **seller/orders 프론트엔드:** `app/seller/orders/page.tsx:82-86` — `res.data`, `res.pagination.totalPages`, `res.pagination.total` 정확히 읽음 ✅
- **Pagination 컴포넌트:** `components/ui/Pagination.tsx` — Prev/숫자/Next 버튼, `page=1`에서 Prev 비활성, `page=totalPages`에서 Next 비활성 ✅
- **미들웨어 인증:** `/seller/*`, `/admin/*`, `/api/seller/*`, `/api/admin/*` JWT 검증 정상 ✅
- **결제 보안:** `payments/confirm/route.ts` — PortOne 서버 검증, 금액 대조, 코드 유효성 재확인, 트랜잭션 처리 정상 ✅

---

## 버그 / 이슈

### 신규 발견 — 즉시 처리 필요

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| B-27 | **MED** | 바이어 채팅 플로우 | `sessionStorage.getItem("pendingCode")` 값을 `JSON.parse()` 할 때 try/catch 없음. sessionStorage 데이터 손상 시 unhandled exception으로 채팅 페이지 전체 크래시 | `app/(buyer)/chat/page.tsx:29` |

**B-27 재현 조건:** 다른 탭/앱이 `liveorder-buyer` 키 근처 sessionStorage에 잘못된 JSON을 쓰거나, 브라우저 확장이 sessionStorage를 수정하는 경우. 드물지만 크래시 위험 있음.

**B-27 수정 방향:**
```typescript
// chat/page.tsx:27-30
const pending = sessionStorage.getItem("pendingCode");
if (pending) {
  sessionStorage.removeItem("pendingCode");
  try {
    const { code, data } = JSON.parse(pending);
    handleCodeData(code, data);
  } catch {
    // 손상된 데이터 무시, 사용자에게 코드 직접 입력 유도
  }
}
```

### 기술 부채 (낮은 우선순위)

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| B-28 | LOW | admin/orders API | `parsePagination()` 미사용 — `take: 50` 하드코딩, 응답 형식이 `{ orders, total }` (셀러 API의 `{ data, pagination }` 표준과 불일치). 프론트엔드는 이에 맞게 구현되어 동작 자체는 정상. | `app/api/admin/orders/route.ts:35-41` |
| B-29 | LOW | seller/orders 에러 처리 | `fetchOrders()` fetch 실패 시 `.catch(() => {})` 로 에러 무시. API 장애 시 빈 목록만 표시, 사용자 피드백 없음 | `app/seller/orders/page.tsx:88` |

### 이전 수정 완료 (이번 스프린트)

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-23~~ | ~~HIGH~~ | ~~UX-2 QR 코드 미구현~~ | ✅ **2026-04-03 완료** | `app/seller/codes/new/page.tsx` |
| ~~B-24~~ | ~~HIGH~~ | ~~환불 API 환경변수 배포 누락 위험~~ | ✅ **2026-04-03 완료** | `liveorder-team/PLAN.md:2.3절` |
| ~~B-25~~ | ~~MED~~ | ~~정산 테이블 `colSpan` 불일치~~ | ✅ **2026-04-03 완료** | `app/seller/settlements/page.tsx:166` |
| ~~B-26~~ | ~~MED~~ | ~~코드 발급 드롭다운에 soft-deleted 상품 표시~~ | ✅ **2026-04-03 완료** | `app/api/seller/products/route.ts` |

### P2 — 이전 스프린트 수정 완료

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-06~~ | ~~LOW~~ | ~~정산 상세 없음~~ | ✅ **완료** | `components/seller/SettlementDetailDrawer.tsx` |
| ~~B-07~~ | ~~LOW~~ | ~~환불 처리 미구현~~ | ✅ **완료** | `app/admin/orders/`, `components/admin/RefundDialog.tsx` |
| ~~B-16~~ | ~~HIGH~~ | ~~관리자 정산 배치 버튼 인증 실패~~ | ✅ **완료** | `app/api/admin/settlements/route.ts` |
| ~~B-17~~ | ~~MED~~ | ~~비활성 상품에 코드 발급 가능~~ | ✅ **완료** | `app/api/seller/codes/route.ts` |
| ~~B-18~~ | ~~MED~~ | ~~셀러 승인 후 JWT 세션 미갱신~~ | ✅ **완료** | `app/seller/dashboard/page.tsx` |
| ~~B-19~~ | ~~LOW~~ | ~~연락처 서버 검증 없음~~ | ✅ **완료** | `app/api/sellers/register/route.ts` |
| ~~B-20~~ | ~~LOW~~ | ~~정산 배치 alert() UX~~ | ✅ **완료** | `app/admin/settlements/page.tsx` |

### P1 — 이전 스프린트 수정 완료

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-01~~ | ~~HIGH~~ | ~~정산 크론 인증 없음~~ | ✅ **완료** | `app/api/cron/settlements/route.ts` |
| ~~B-02~~ | ~~HIGH~~ | ~~동시 주문 레이스 컨디션~~ | ✅ **완료** | `app/api/payments/confirm/route.ts` |
| ~~B-15~~ | ~~HIGH~~ | ~~결제 우회 엔드포인트~~ | ✅ **완료** — `app/api/orders/route.ts` 삭제 | 삭제됨 |

### P3 — MVP 이후

| # | 내용 |
|---|------|
| B-10 | Redis 캐싱 미구현 |
| B-11 | 이메일 알림 없음 (Task 23 예정) |
| B-12 | 택배사 API 배송 추적 없음 |
| B-13 | 셀러 대시보드 차트 없음 |
| B-14 | CSV 대용량 처리 (페이지네이션 없음) |

---

## 미구현 기능

| 기능 | 기획 여부 | 상태 |
|------|-----------|------|
| UX-2 QR 코드 생성 (코드 발급 후 즉시 표시) | 기획서 명시 | ✅ 완료 (2026-04-03, B-23) |
| 환불 UI (관리자) | 기획서 명시 | ✅ 완료 (2026-04-03, P2-1) |
| 정산 상세 드릴다운 | 기획서 명시 | ✅ 완료 (2026-04-03, Task 19) |
| API 페이지네이션 (셀러 목록) | 기획서 명시 | ✅ 완료 (2026-04-03, Task 22) |
| 이메일 알림 (Resend) | 기획서 명시 | ⏳ Task 23 진행 예정 |
| 셀러 이메일 인증 | 기획서 명시 | Phase 3 예정 |
| 구매자 데이터 삭제권 (GDPR) | 개인정보법 요구 | Phase 3 예정 |

---

## 기술 부채

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| `chat/page.tsx` JSON.parse 예외처리 누락 (B-27) | MED | ⚠️ 신규 발견 — 수정 필요 |
| `admin/orders` API — `parsePagination()` 미사용, 응답 형식 불일치 (B-28) | LOW | 미처리 (동작은 정상) |
| `seller/orders` fetch 에러 무시 (B-29) | LOW | 미처리 |
| `SettlementDetailDrawer` fetch 에러 사용자 피드백 없음 | LOW | ✅ **Task 21에서 수정** |
| `admin/orders/page.tsx` 로딩 상태 없음 | LOW | ✅ **Task 21에서 수정** |
| `RefundDialog` 성공 후 상태 초기화 우회 | LOW | ✅ **Task 21에서 수정** |
| buyer-store 타입 안전성 (`Record<string, unknown>`) | LOW | ✅ **Task 21에서 수정** |
| API 전체 페이지네이션 없음 (B-21) | MED | ✅ **Task 22에서 셀러 3개 API 완료** |

---

## 검증 필요 항목 (수동 QA)

| # | 항목 | 상태 |
|---|------|------|
| QA-1 | 결제 플로우: PortOne 테스트 결제창 → 서버 검증 → 주문 DB 생성 | ✅ **2026-04-03 코드 검증** — `payments/confirm/route.ts`: getPayment() 서버 검증, amount 대조, 원자적 트랜잭션 주문 생성 |
| QA-2 | 운송장 등록: PAID 주문 → Dialog → 제출 → SHIPPING 전환 | ✅ **2026-04-03 코드 검증** — `seller/orders/page.tsx` Dialog UI + `api/seller/orders/[id]/tracking/route.ts` SHIPPING 전환 |
| QA-3 | 관리자 승인: 셀러 "승인 확인" 버튼 → 자동 로그아웃 → 재로그인 → PENDING 배너 사라짐 | ✅ **2026-04-03 코드 검증** — `seller/dashboard/page.tsx`: `/api/seller/me` 조회 → APPROVED 시 signOut → login?message=approved |
| QA-4 | 정산 크론: `POST /api/cron/settlements` (Bearer $CRON_SECRET) → Settlement 생성 + SETTLED 전환 | ✅ **2026-04-03 코드 검증** — `api/cron/settlements/route.ts`: CRON_SECRET Bearer 인증 → 셀러별 그룹핑 → Settlement 생성 |
| QA-5 | 미들웨어: 비로그인 `/seller/dashboard` 접근 → `/seller/auth/login` 리다이렉트 | ✅ **2026-04-03 코드 검증** — `middleware.ts`: role 없으면 `/seller/auth/login?callbackUrl=...` 리다이렉트 |
| QA-6 | 이미지 업로드: 5MB 초과 → 오류 메시지, 정상 이미지 → Vercel Blob URL 저장 | ✅ **2026-04-03 코드 검증** — `api/seller/products/upload/route.ts`: 5MB 초과 시 400 에러, Vercel Blob put() → URL 반환 |
| QA-7 | 페이지네이션: 셀러 주문 목록 20건 초과 → Prev/Next 버튼 활성화, 페이지 전환 | 코드 검증 완료 — `seller/orders`, `seller/products`, `seller/codes` 모두 `buildPaginationResponse` 적용, Pagination 컴포넌트 연동 |
| QA-8 | SettlementDetailDrawer 에러 처리: API 실패 → "상세 정보를 불러오지 못했습니다" 메시지 표시 | ✅ **코드 검증** — `SettlementDetailDrawer.tsx:83-105`: catch → setError → 에러 메시지 렌더링 |

---

## 배포 가능 기준

Phase 1 MVP 배포 가능 기준:
- [x] 핵심 플로우 전체 구현 완료
- [x] T-08: debug 엔드포인트 제거 ✅
- [x] T-09: 상품 이미지 업로드 (Vercel Blob) ✅
- [x] B-01: 정산 크론 인증 ✅
- [x] B-02: 동시 주문 레이스 컨디션 수정 ✅
- [x] B-15: `/api/orders` 결제 우회 엔드포인트 제거 ✅
- [x] B-16: 관리자 정산 배치 버튼 인증 수정 ✅
- [x] B-23: UX-2 QR 코드 구현 완료 ✅
- [x] B-24: `PORTONE_API_SECRET` PLAN.md 체크리스트 추가 완료 ✅
- [x] B-25: 정산 테이블 colSpan=8 수정 완료 ✅
- [x] B-26: `/api/seller/products` isActive 필터 추가 완료 ✅
- [x] 수동 QA 6개 항목 코드 검증 완료 (Task 12) ✅
- [x] P3-0 기술 부채 4개 항목 수정 완료 (Task 21) ✅
- [x] P3-1 API 페이지네이션 구현 완료 (Task 22) ✅
- [ ] **B-27: chat/page.tsx JSON.parse try/catch 추가 필요** ⚠️

---

## 환경변수 최종 체크리스트 (배포 전)

| 변수명 | 용도 | 상태 |
|--------|------|------|
| `DATABASE_URL` | Neon PostgreSQL | PLAN.md 기재 |
| `NEXTAUTH_SECRET` | JWT 서명 | PLAN.md 기재 |
| `PORTONE_API_KEY` | PortOne V2 API 키 | PLAN.md 기재 |
| `PORTONE_STORE_ID` | PortOne 상점 ID | PLAN.md 기재 |
| `PORTONE_API_SECRET` | PortOne 환불 API 인증 | ✅ PLAN.md 추가 완료 (B-24) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | PLAN.md 기재 |
| `CRON_SECRET` | 정산 크론 Bearer 토큰 | PLAN.md 기재 |
| `NEXTAUTH_URL` | 프로덕션 URL | PLAN.md 기재 |
| `RESEND_API_KEY` | 이메일 알림 (Task 23 예정) | ⏳ Task 23 완료 후 추가 |
