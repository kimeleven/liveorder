# LIVEORDER QA 리포트

> 최종 업데이트: 2026-04-03 (Planner 재검토 — Task 28 코드 미반영 확인, Task 29 B-32 계획 추가)
> QA 단계: Phase 3 마무리 — P3-0~P3-6 완료, B-30/B-31 수정 완료, Task 28 (B-28/B-29) 미구현 확인, Task 29 (B-32) 계획

---

## 핵심 플로우 상태

| 단계 | 플로우 | 상태 | 비고 |
|------|--------|------|------|
| SELLER | 회원가입 → 이메일 인증 메일 발송 | ✅ | emailVerifyToken 생성 + Resend 발송 |
| SELLER | 이메일 인증 링크 클릭 → 인증 완료 | ✅ | verify route.ts 정상 |
| SELLER | 미인증 셀러 로그인 차단 | ✅ | B-31 수정 완료 (fc0236f) — lib/auth.ts emailVerified 체크 추가 |
| SELLER | 상품 등록 → 코드 자동 발급 (UX-1) | ✅ | autoCode 반환 + 성공 화면 표시 |
| SELLER | 코드 발급 페이지 QR 코드 (UX-2) | ✅ | `qrcode` 설치, 발급 성공 화면 QR 표시 + `/order/[code]` 라우트 |
| SELLER | 코드 발급 드롭다운 상품명 표시 (UX-3) | ✅ | shadcn SelectItem children 자동 표시 |
| SELLER | 코드 API 보안 | ✅ | `/api/seller/codes` 정상 |
| SELLER | 상품 수정/삭제 | ✅ | Soft delete 정상 |
| SELLER | 상품 이미지 업로드 | ✅ | Vercel Blob 연동, 5MB/image/* 제한 |
| SELLER | 주문 목록 페이지네이션 | ✅ | P3-1 완료 — `{ data, pagination }` 형식 |
| SELLER | 상품 목록 페이지네이션 | ✅ | P3-1 완료 |
| SELLER | 코드 목록 페이지네이션 | ✅ | P3-1 완료 |
| SELLER | 대시보드 7일 매출 차트 | ✅ | P3-3 완료 — recharts LineChart, BigInt→Number 변환 |
| SELLER | 이메일 인증 재발송 버튼 | ✅ | 대시보드 미인증 배너 + 재발송 버튼 |
| BUYER | 코드 입력 → 상품 확인 | ✅ | 랜딩 + 채팅 플로우 |
| BUYER | 결제 (PortOne) | ✅ | 서버 검증 완료, 금액 대조 |
| BUYER | 배송지 입력 + 개인정보 동의 | ✅ | 체크박스 미체크 시 제출 불가 |
| BUYER | 주문 조회 (비회원) | ✅ | 전화번호 + 주문번호 |
| BUYER | 배송 추적 링크 (CJ/롯데/한진/로젠) | ✅ | P3-4 완료 |
| BUYER | 배송 추적 링크 (우체국) | ✅ | B-30 수정 완료 (fc0236f) — '우체국' → '우체국택배' 키 통일 |
| BUYER | 개인정보 삭제 요청 | ✅ | P3-6 구현 완료 (3b39223) — data-deletion API + request 페이지 |
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

### P3-5 셀러 이메일 인증 (Task 26) — 부분 완료 ✅⚠️

- **회원가입 시 토큰 생성 + 발송:** `app/api/sellers/register/route.ts:49-80` — `randomBytes(32).toString("hex")` 토큰 생성, 셀러에게 인증 메일 + 관리자에게 가입 알림 동시 발송 ✅
- **이메일 인증 라우트:** `app/api/seller/auth/verify/route.ts` — 토큰 조회 → emailVerified=true, token=null 업데이트 → 결과 페이지로 리다이렉트 ✅
- **인증 재발송:** `app/api/seller/auth/verify/resend/route.ts` — 이메일로 셀러 조회, 새 토큰 생성 후 재발송. 미존재 이메일에도 200 반환(보안상 올바름) ✅
- **인증 결과 페이지:** `app/seller/auth/verify/page.tsx` — success/already/invalid/error 4가지 상태 표시, Suspense + useSearchParams 래핑 ✅
- **대시보드 배너:** `app/seller/dashboard/page.tsx:144-163` — `emailVerified === false`인 경우 파란색 배너 + 재발송 버튼 표시 ✅
- **email.ts ADMIN_EMAIL:** `lib/email.ts:21` — `.env.example`에 `ADMIN_EMAIL` 포함, 환경변수 미설정 시 `admin@liveorder.app` fallback ✅
- **이슈:** B-31 참고 — 로그인 차단 미구현

### P3-4 배송 추적 (Task 25) — 부분 완료 ✅⚠️

- **carrier-urls.ts:** `lib/carrier-urls.ts` — 6개 택배사 URL 매핑 + `getTrackingUrl()` 함수 ✅
- **lookup 페이지 추적 링크:** `app/(buyer)/lookup/page.tsx:114-128` — 운송장 있는 경우 새 탭 추적 링크 ✅
- **이슈:** B-30 참고 — 우체국택배 키 불일치

### P3-3 셀러 대시보드 차트 (Task 24) — 완료 ✅

- **dailySales API:** `app/api/seller/dashboard/route.ts:49-67` — `generate_series`로 7일 시리즈 생성, LEFT JOIN으로 주문 집계, BigInt → Number 변환 ✅
- **LineChart 컴포넌트:** `app/seller/dashboard/page.tsx:205-234` — recharts `ResponsiveContainer`, 만 원 단위 Y축 formatter, 데이터 없을 시 차트 숨김 ✅
- **emailVerified fallback:** `app/api/seller/dashboard/route.ts:75` — `seller?.emailVerified ?? true` — seller가 null이면 true로 fallback (401 처리 이후이므로 실질적으로 도달 불가, 안전함) ✅

### P3-0 기술 부채 클린업 (Task 21) — 전체 수정 확인 ✅

- **SettlementDetailDrawer 에러 처리:** `components/seller/SettlementDetailDrawer.tsx:83-87` ✅
- **admin/orders 로딩 상태:** `app/admin/orders/page.tsx:63,71-72` ✅
- **RefundDialog 상태 초기화:** `components/admin/RefundDialog.tsx:82-88` ✅
- **buyer-store 타입 안전성:** `stores/buyer-store.ts:34-56` ✅

### P3-1 API 페이지네이션 (Task 22) — 셀러 API 3개 완료 ✅

- **lib/pagination.ts:** `parsePagination()` + `buildPaginationResponse()` ✅
- **seller/orders, seller/products, seller/codes API:** 페이지네이션 적용 ✅
- **Pagination 컴포넌트:** `components/ui/Pagination.tsx` — Prev/숫자/Next 버튼 ✅

---

## 버그 / 이슈

### 신규 발견 — 즉시 처리 필요

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| B-32 | LOW | 이메일 인증 — 토큰 만료 | 인증 토큰에 만료 시간 없음. 이메일 본문에 "24시간 이내 사용" 안내하지만 `verify/route.ts`에서 만료 검증 로직 없음 → 토큰이 무기한 유효. 재발송 시 토큰 교체는 됨 | `app/api/seller/auth/verify/route.ts` |

**B-32 수정 방향 (Task 29 — TASKS.md 상세 스펙 참고):**
- schema.prisma: `emailVerifyTokenExpiresAt DateTime?` 추가 → `migrate dev`
- register/route.ts + resend/route.ts: 토큰 생성 시 `expiresAt = now + 24h` 저장
- verify/route.ts: 만료 시간 검증 후 expired → redirect `?result=expired`
- verify/page.tsx: `expired` 케이스 UI 추가

### 이번 스프린트 수정 완료 (B-30, B-31)

| # | 우선순위 | 기능 | 내용 | 커밋 |
|---|----------|------|------|------|
| ~~B-30~~ | ~~MED~~ | ~~배송 추적 — 우체국~~ | ✅ **2026-04-03 완료** — '우체국' → '우체국택배' 키 통일 | fc0236f |
| ~~B-31~~ | ~~MED~~ | ~~이메일 인증 — 로그인 차단~~ | ✅ **2026-04-03 완료** — lib/auth.ts emailVerified 체크 추가 | fc0236f |

### 기술 부채 (낮은 우선순위)

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| B-28 | LOW | admin/orders API | `parsePagination()` 미사용 — `take: 50` 하드코딩, 응답 형식이 `{ orders, total }` (셀러 API의 `{ data, pagination }` 표준과 불일치). 동작 자체는 정상. | `app/api/admin/orders/route.ts:35-41` |
| B-29 | LOW | seller/orders 에러 처리 | `fetchOrders()` fetch 실패 시 `.catch(() => {})` 로 에러 무시. API 장애 시 빈 목록만 표시, 사용자 피드백 없음 | `app/seller/orders/page.tsx:88` |

### 이전 수정 완료 (이번 스프린트)

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-27~~ | ~~MED~~ | ~~바이어 채팅 플로우~~ | ✅ **2026-04-03 완료** — try/catch 추가 (2e58865) | ~~`app/(buyer)/chat/page.tsx:29`~~ |
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

| # | 내용 | 상태 |
|---|------|------|
| B-10 | Redis 캐싱 미구현 | 트래픽 확인 후 검토 |
| B-11 | 이메일 알림 없음 | ✅ **완료** (Task 23, c16cd41) |
| B-12 | 택배사 API 배송 추적 없음 | ✅ **완료** (Task 25, fbadce1) — 우체국 키 버그(B-30) 수정 필요 |
| B-13 | 셀러 대시보드 차트 없음 | ✅ **완료** (Task 24, fbadce1) |
| B-14 | CSV 대용량 처리 (페이지네이션 없음) | 낮은 우선순위 |

---

## 미구현 기능

| 기능 | 기획 여부 | 상태 |
|------|-----------|------|
| UX-2 QR 코드 생성 (코드 발급 후 즉시 표시) | 기획서 명시 | ✅ 완료 (2026-04-03, B-23) |
| 환불 UI (관리자) | 기획서 명시 | ✅ 완료 (2026-04-03, P2-1) |
| 정산 상세 드릴다운 | 기획서 명시 | ✅ 완료 (2026-04-03, Task 19) |
| API 페이지네이션 (셀러 목록) | 기획서 명시 | ✅ 완료 (2026-04-03, Task 22) |
| 이메일 알림 (Resend) | 기획서 명시 | ✅ 완료 (2026-04-03, Task 23) |
| 셀러 대시보드 7일 매출 차트 | 기획서 명시 | ✅ 완료 (2026-04-03, Task 24) |
| 배송 추적 링크 (택배사별 URL) | 기획서 명시 | ✅ 완료 (2026-04-03, Task 25) — B-30 수정 필요 |
| 셀러 이메일 인증 (인증 메일 + 결과 페이지) | 기획서 명시 | ✅ 완료 (Task 26) — B-31 로그인 차단 미구현 |
| 구매자 데이터 삭제권 (GDPR) | 개인정보법 요구 | ✅ **완료** (Task 27, 3b39223) |

---

## 기술 부채

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| `chat/page.tsx` JSON.parse 예외처리 누락 (B-27) | MED | ✅ 수정 완료 (2e58865) |
| 우체국택배 배송 추적 키 불일치 (B-30) | MED | ✅ 수정 완료 (fc0236f) |
| 이메일 인증 로그인 차단 미구현 (B-31) | MED | ✅ 수정 완료 (fc0236f) |
| 이메일 인증 토큰 만료 검증 없음 (B-32) | LOW | ❌ 미처리 (Task 28 이후) |
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
| QA-1 | 결제 플로우: PortOne 테스트 결제창 → 서버 검증 → 주문 DB 생성 | ✅ **코드 검증** — `payments/confirm/route.ts`: getPayment() 서버 검증, amount 대조, 원자적 트랜잭션 |
| QA-2 | 운송장 등록: PAID 주문 → Dialog → 제출 → SHIPPING 전환 | ✅ **코드 검증** — Dialog UI + tracking route.ts SHIPPING 전환 |
| QA-3 | 관리자 승인: 셀러 "승인 확인" 버튼 → 자동 로그아웃 → 재로그인 → PENDING 배너 사라짐 | ✅ **코드 검증** — `seller/dashboard/page.tsx` signOut + login?message=approved |
| QA-4 | 정산 크론: `POST /api/cron/settlements` (Bearer $CRON_SECRET) → Settlement 생성 + SETTLED 전환 | ✅ **코드 검증** — Bearer 인증, 셀러별 그룹핑, Settlement 생성 |
| QA-5 | 미들웨어: 비로그인 `/seller/dashboard` 접근 → `/seller/auth/login` 리다이렉트 | ✅ **코드 검증** — middleware.ts role 없으면 리다이렉트 |
| QA-6 | 이미지 업로드: 5MB 초과 → 오류 메시지, 정상 이미지 → Vercel Blob URL 저장 | ✅ **코드 검증** — 5MB 초과 시 400 에러, Vercel Blob put() → URL |
| QA-7 | 페이지네이션: 셀러 주문 목록 20건 초과 → Prev/Next 버튼 활성화 | ✅ **코드 검증** — seller/orders, seller/products, seller/codes 모두 적용 |
| QA-8 | SettlementDetailDrawer 에러 처리: API 실패 → 에러 메시지 표시 | ✅ **코드 검증** — catch → setError → 에러 메시지 렌더링 |
| QA-9 | 이메일 인증: 회원가입 → 인증 메일 수신 → 링크 클릭 → success 화면 | ⚠️ 코드 검증 완료, **실제 RESEND_API_KEY 필요** (배포 환경에서 수동 확인 필요) |
| QA-10 | 이메일 인증 재발송: 대시보드 배너 → "인증 메일 재발송" 클릭 → 새 토큰 발송 | ⚠️ 코드 검증 완료, 실제 이메일 수신 확인 필요 |
| QA-11 | 배송 추적: CJ대한통운 운송장 등록 → 주문 조회 → 배송 추적 → 클릭 | ✅ **코드 검증** — getTrackingUrl() URL 생성 확인 (우체국 제외) |

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
- [x] **B-27: chat/page.tsx JSON.parse try/catch 추가** ✅

---

## 환경변수 최종 체크리스트 (배포 전)

| 변수명 | 용도 | 상태 |
|--------|------|------|
| `DATABASE_URL` | Neon PostgreSQL | PLAN.md 기재 |
| `NEXTAUTH_SECRET` | JWT 서명 | PLAN.md 기재 |
| `PORTONE_API_KEY` | PortOne V2 API 키 | `.env.example` 기재 |
| `PORTONE_STORE_ID` | PortOne 상점 ID | `.env.example` 기재 |
| `PORTONE_API_SECRET` | PortOne 환불 API 인증 | ✅ PLAN.md 추가 완료 (B-24) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | PLAN.md 기재 |
| `CRON_SECRET` | 정산 크론 Bearer 토큰 | PLAN.md 기재 |
| `NEXTAUTH_URL` | 프로덕션 URL | PLAN.md 기재 |
| `RESEND_API_KEY` | 이메일 알림 | ✅ `.env.example` 추가 완료 (Task 23) |
| `ADMIN_EMAIL` | 셀러 가입 알림 수신 이메일 | ✅ `.env.example` 기재, 미설정 시 `admin@liveorder.app` fallback |
