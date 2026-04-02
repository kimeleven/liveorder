# LIVEORDER QA 리포트

> 최종 업데이트: 2026-04-03 (PM 조율 — Phase 2 완료 항목 반영)
> QA 단계: Phase 1 MVP — 배포 전 최종 검증

---

## 핵심 플로우 상태

| 단계 | 플로우 | 상태 | 비고 |
|------|--------|------|------|
| SELLER | 회원가입 → 사업자 인증 | ✅ | 관리자 승인 후 APPROVED 전환 |
| SELLER | 상품 등록 → 코드 발급 | ✅ | PENDING 상태 시 차단 (403) |
| SELLER | 코드 API 보안 | ✅ | `/api/seller/codes`로 이동 완료 |
| SELLER | 상품 수정/삭제 | ✅ | Soft delete, `/api/seller/products/[id]` |
| SELLER | 상품 이미지 업로드 | ✅ | Vercel Blob 연동, 5MB/image/* 제한 |
| BUYER | 코드 입력 → 상품 확인 | ✅ | 랜딩 + 채팅 플로우 |
| BUYER | 결제 (PortOne) | ✅ | 서버 검증 완료, 금액 대조 |
| BUYER | 배송지 입력 + 개인정보 동의 | ✅ | 체크박스 미체크 시 제출 불가 |
| BUYER | 주문 조회 (비회원) | ✅ | 전화번호 + 주문번호 |
| SELLER | 주문 확인 → 배송지 CSV | ✅ | UTF-8 BOM, CSV 다운로드 |
| SELLER | 운송장 등록 | ✅ | Dialog UI, PAID/SHIPPING 상태 |
| SELLER | 배송완료 상태 (DELIVERED) | ✅ | enum + 마이그레이션 완료 |
| SELLER | 정산 조회 | ✅ | 목록 + 필터 + 합계 |
| ADMIN | 셀러 승인/거부/정지 | ✅ | 감사 로그 포함 |
| ADMIN | 정산 처리 (크론) | ⚠️ | 자동 크론은 정상, **수동 배치 버튼 인증 실패** (B-16) |

---

## 정상 동작 확인

- **미들웨어 인증:** `/seller/*`, `/admin/*`, `/api/seller/*`, `/api/admin/*` 전 경로 JWT 검증 확인 (`middleware.ts:38-70`)
- **결제 보안:** `payments/confirm/route.ts` — PortOne 서버 검증, 금액 대조, 코드 유효성 재확인, 트랜잭션 처리 정상
- **레이스 컨디션 방지:** `payments/confirm/route.ts` — 원자적 `UPDATE ... WHERE ... RETURNING id` SQL, 동시 요청 시 한 건만 성공 보장 ✅
- **개인정보 동의:** `AddressForm.tsx:148-155` — 두 체크박스 모두 체크 시에만 제출 버튼 활성화
- **PENDING 셀러 차단:** `seller/products/route.ts:27-32` — 상품 등록 시 APPROVED 상태 DB 재확인 (403 반환)
- **디버그 엔드포인트:** `/app/api/debug/` 디렉토리 없음 — T-08 완료 확인 ✅
- **이미지 업로드:** `seller/products/new/page.tsx` Vercel Blob 업로드 UI, 미리보기, X 버튼 구현 — T-09 완료 확인 ✅
- **감사 로그:** `admin/sellers/[id]/route.ts` — 상태 변경마다 `SellerAuditLog` 기록
- **정산 계산:** 플랫폼 수수료 2.5% + PG 수수료 2.2%, 트랜잭션 내 Settlement 생성 + 주문 SETTLED 전환
- **코드 검증 N+1 수정:** `app/api/codes/[code]/route.ts:12-29` — 단일 쿼리로 seller status 포함 조회 ✅
- **채팅 오류 재시도:** `ChatMessage.tsx` — `retryAction` 필드 기반 재시도 버튼 렌더링 ✅
- **주문 완료 후 재입력:** `components/buyer/cards/OrderConfirmation.tsx` — "새 코드 입력하기" 버튼 ✅
- **카테고리 필수 검증 UX:** `seller/products/new/page.tsx` — `categoryError` state + 빨간 테두리 ✅
- **연락처 형식 검증 (프론트엔드):** `components/buyer/cards/AddressForm.tsx` — 정규식 `/^01[0-9]-\d{3,4}-\d{4}$/` ✅
- **정산 크론 인증:** `app/api/cron/settlements/route.ts` — CRON_SECRET Bearer 토큰 인증 ✅

---

## 버그 / 이슈

### P1 — 배포 전 처리 완료 (이전 스프린트)

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-01~~ | ~~HIGH~~ | ~~정산 크론 인증 없음~~ | ✅ **2026-04-02 수정** — `CRON_SECRET` 환경변수 기반 Bearer 토큰 인증 추가. | `app/api/cron/settlements/route.ts` |
| ~~B-02~~ | ~~HIGH~~ | ~~동시 주문 레이스 컨디션~~ | ✅ **2026-04-02 수정** — 수량 검사를 트랜잭션 내부의 원자적 조건부 UPDATE로 교체. | `app/api/payments/confirm/route.ts` |
| ~~B-03~~ | ~~MED~~ | ~~카테고리 필수 검증 UX~~ | ✅ **2026-04-02 수정** | `app/seller/products/new/page.tsx` |
| ~~B-04~~ | ~~MED~~ | ~~연락처 형식 미검증~~ | ✅ **2026-04-02 수정** (프론트엔드) | `components/buyer/cards/AddressForm.tsx` |
| ~~B-05~~ | ~~MED~~ | ~~코드 검증 N+1 쿼리~~ | ✅ **2026-04-02 수정** | `app/api/codes/[code]/route.ts` |
| ~~B-08~~ | ~~LOW~~ | ~~채팅 오류 재시도 없음~~ | ✅ **2026-04-02 수정** | `components/buyer/ChatMessage.tsx` |
| ~~B-09~~ | ~~LOW~~ | ~~결제 후 새 코드 입력 버튼 없음~~ | ✅ **2026-04-02 수정** | `components/buyer/cards/OrderConfirmation.tsx` |

### P1 — 이번 리뷰에서 신규 발견 (배포 전 처리 필요)

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-15~~ | ~~HIGH~~ | ~~결제 우회 엔드포인트~~ | ✅ **2026-04-02 수정** — `app/api/orders/route.ts` 파일 삭제. 결제는 `/api/payments/confirm`으로만 가능. | `app/api/orders/route.ts` (삭제됨) |
| ~~B-16~~ | ~~HIGH~~ | ~~관리자 정산 배치 버튼 인증 실패~~ | ✅ **2026-04-02 수정** — `/api/admin/settlements` POST 엔드포인트 신설, 서버사이드에서 CRON_SECRET 헤더 추가 후 cron API 호출. 클라이언트에서 직접 cron 호출 제거. | `app/api/admin/settlements/route.ts`, `app/admin/settlements/page.tsx` |

### P2 — 다음 스프린트

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| B-06 | LOW | 정산 상세 없음 | 🔄 **2026-04-03 진행 중** — 스키마(settlementId FK)+크론 수정 완료, API+UI 미완 (Task 19) | `app/seller/settlements/page.tsx` |
| ~~B-07~~ | ~~LOW~~ | ~~환불 처리 미구현~~ | ✅ **2026-04-03 완료** — 관리자 주문 목록 + RefundDialog + 환불 API 구현 (048ac72, P2-1) | `app/admin/orders/`, `components/admin/RefundDialog.tsx` |
| ~~B-17~~ | ~~MED~~ | ~~비활성 상품에 코드 발급 가능~~ | ✅ **2026-04-02 수정** — 코드 발급 시 `isActive: true` 조건 추가. 비활성 상품은 404 반환. | `app/api/seller/codes/route.ts` |
| ~~B-18~~ | ~~MED~~ | ~~셀러 승인 후 JWT 세션 미갱신~~ | ✅ **2026-04-03 완료** — PENDING 배너에 "승인 확인" 버튼 추가. 승인 시 자동 로그아웃 후 안내 메시지 표시 (49a984b) | `app/seller/dashboard/page.tsx`, `app/api/seller/me/route.ts` |
| ~~B-19~~ | ~~LOW~~ | ~~연락처/전화번호 서버 검증 없음~~ | ✅ **2026-04-03 완료** — `/api/sellers/register`, `/api/payments/confirm` 서버측 정규식 검증 추가 (6bcb637) | `app/api/sellers/register/route.ts`, `app/api/payments/confirm/route.ts` |
| ~~B-20~~ | ~~LOW~~ | ~~정산 배치 실행 UX~~ | ✅ **2026-04-03 완료** — `alert()` 제거, inline 상태 메시지로 교체, `res.ok` 오류 처리 추가 (6bcb637) | `app/admin/settlements/page.tsx` |

### P3 — MVP 이후

| # | 내용 |
|---|------|
| B-10 | Redis 캐싱 미구현 (기획서 명시, MVP 이후 고려) |
| B-11 | 이메일 알림 없음 (주문 접수, 정산 완료 알림) |
| B-12 | 택배사 API 배송 추적 없음 (수동 운송장 입력만 가능) |
| B-13 | 셀러 대시보드 차트 없음 |
| B-14 | CSV 주문 내보내기 — 페이지네이션 없음 (대용량 시 메모리 이슈 가능) |
| B-21 | 전체 목록 API 페이지네이션 없음 (orders, products, codes, settlements 모두) |
| B-22 | 셀러 대시보드 "최근 주문" 섹션이 placeholder — 실제 데이터 미표시 |

---

## 미구현 기능

| 기능 | 기획 여부 | 상태 |
|------|-----------|------|
| 환불 UI (관리자) | 기획서 명시 | ✅ 완료 (2026-04-03, P2-1) |
| 정산 상세 드릴다운 | 기획서 명시 | 🔄 진행 중 (Task 19) |
| 셀러 이메일 인증 | 기획서 명시 | Phase 2 예정 |
| 구매자 데이터 삭제권 (GDPR) | 개인정보법 요구 | 미반영 |

---

## 기술 부채

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| `/api/cron/settlements` 인증 추가 | HIGH (배포 전) | ✅ 완료 |
| 동시 주문 레이스 컨디션 방지 (트랜잭션 내 수량 검증) | HIGH | ✅ 완료 |
| `.env.example` PortOne/Blob/Cron 변수 추가 | MEDIUM | ✅ 완료 (2026-04-02) |
| `/api/codes/[code]` seller status 쿼리 최적화 | LOW | ✅ 완료 (2026-04-02) |
| `/api/orders` 결제 우회 엔드포인트 제거 | **HIGH** | ✅ 완료 (2026-04-02, B-15) |
| 관리자 수동 정산 배치 CRON_SECRET 인증 문제 | **HIGH** | ✅ 완료 (2026-04-02, B-16) |
| 코드 발급 시 `isActive` 상품 필터 추가 | MED | ✅ 완료 (2026-04-02, B-17) |
| buyer-store 타입 안전성 (`Record<string, unknown>` 개선) | LOW | 미처리 |

---

## 검증 필요 항목 (수동 QA)

1. **결제 플로우:** PortOne 테스트 결제창 호출 → 서버 검증 → 주문 생성 확인
2. **운송장 등록:** 주문 PAID 상태 → 운송장 Dialog → 제출 → SHIPPING 전환 확인
3. **관리자 승인:** 셀러 회원가입 → 관리자 로그인 → 승인 → 셀러 대시보드 PENDING 배너 사라짐 (재로그인 필요 여부 확인)
4. **정산 크론:** Vercel Cron 자동 트리거 → Settlement 레코드 생성 + 주문 SETTLED 확인 (수동 버튼은 B-16 수정 후 검증)
5. **미들웨어 인증:** 비로그인 상태에서 `/seller/dashboard` 직접 접근 시 로그인으로 리다이렉트
6. **이미지 업로드:** 5MB 초과 파일 업로드 시 오류 메시지 표시, 정상 이미지 Vercel Blob URL 저장 확인

---

## 배포 가능 기준

Phase 1 MVP 배포 가능 기준:
- [x] 핵심 플로우 15단계 (14단계 ✅, 1단계 ⚠️)
- [x] T-08: debug 엔드포인트 제거 ✅ (2026-04-02)
- [x] T-09: 상품 이미지 업로드 (Vercel Blob) ✅ (2026-04-02)
- [x] B-01: 정산 크론 인증 (CRON_SECRET Bearer) ✅ (2026-04-02)
- [x] B-02: 동시 주문 레이스 컨디션 수정 ✅ (2026-04-02)
- [x] **B-15: `/api/orders` 결제 우회 엔드포인트 제거** ✅ (2026-04-02)
- [x] **B-16: 관리자 정산 배치 버튼 인증 수정** ✅ (2026-04-02)
- [ ] **수동 QA 6개 항목 통과** ← 진행 중
