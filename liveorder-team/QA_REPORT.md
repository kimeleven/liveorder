# LIVEORDER QA 리포트

> 최종 업데이트: 2026-04-03 (QA 자동화 — Phase 1 배포 전 최종 코드 리뷰)
> QA 단계: Phase 1 MVP — 배포 전 최종 검증 (신규 버그 2개 발견)

---

## 핵심 플로우 상태

| 단계 | 플로우 | 상태 | 비고 |
|------|--------|------|------|
| SELLER | 회원가입 → 사업자 인증 | ✅ | 관리자 승인 후 APPROVED 전환 |
| SELLER | 상품 등록 → 코드 자동 발급 (UX-1) | ✅ | autoCode 반환 + 성공 화면 표시 |
| SELLER | 코드 발급 페이지 QR 코드 (UX-2) | ❌ | `qrcode` 미설치, 구현 없음 |
| SELLER | 코드 발급 드롭다운 상품명 표시 (UX-3) | ✅ | shadcn SelectItem children 자동 표시 |
| SELLER | 코드 API 보안 | ✅ | `/api/seller/codes` 정상 |
| SELLER | 상품 수정/삭제 | ✅ | Soft delete 정상 |
| SELLER | 상품 이미지 업로드 | ✅ | Vercel Blob 연동, 5MB/image/* 제한 |
| BUYER | 코드 입력 → 상품 확인 | ✅ | 랜딩 + 채팅 플로우 |
| BUYER | 결제 (PortOne) | ✅ | 서버 검증 완료, 금액 대조 |
| BUYER | 배송지 입력 + 개인정보 동의 | ✅ | 체크박스 미체크 시 제출 불가 |
| BUYER | 주문 조회 (비회원) | ✅ | 전화번호 + 주문번호 |
| SELLER | 주문 확인 → 배송지 CSV | ✅ | UTF-8 BOM, CSV 다운로드 |
| SELLER | 운송장 등록 | ✅ | Dialog UI, PAID/SHIPPING 상태 |
| SELLER | 배송완료 상태 (DELIVERED) | ✅ | enum + 마이그레이션 완료 |
| SELLER | 정산 조회 + 상세 드릴다운 | ✅ | SettlementDetailDrawer 정상 |
| ADMIN | 셀러 승인/거부/정지 | ✅ | 감사 로그 포함 |
| ADMIN | 정산 처리 (크론 + 수동) | ✅ | CRON_SECRET 인증, B-16 수정 완료 |
| ADMIN | 주문 목록 + 환불 UI | ✅ | RefundDialog + API 정상 (단, 배포 환경변수 주의) |

---

## 정상 동작 확인

- **미들웨어 인증:** `/seller/*`, `/admin/*`, `/api/seller/*`, `/api/admin/*` JWT 검증, HKDF salt 버그 수정 완료 (`middleware.ts:21-28`)
- **UX-3 드롭다운:** `seller/codes/new/page.tsx:130-133` — shadcn `SelectItem`의 children(`{p.name} (₩{p.price.toLocaleString()})`)이 `SelectValue`에 자동 표시, UUID 노출 없음 ✅
- **UX-1 상품 등록 자동 코드:** `api/seller/products/route.ts:59-78` — 상품 등록 후 `autoCode` 자동 생성, 실패 시 상품 등록은 유지 (graceful degradation) ✅
- **결제 보안:** `payments/confirm/route.ts` — PortOne 서버 검증, 금액 대조, 코드 유효성 재확인, 트랜잭션 처리 정상
- **레이스 컨디션 방지:** `payments/confirm/route.ts:87-95` — 원자적 `UPDATE ... WHERE ... RETURNING id` SQL ✅
- **개인정보 동의:** `AddressForm.tsx` — 두 체크박스 모두 체크 시에만 제출 버튼 활성화
- **PENDING 셀러 차단:** `seller/products/route.ts:27-32`, `seller/codes/route.ts:27-32` — 상품/코드 API 모두 APPROVED 상태 DB 재확인 (403 반환)
- **코드 검증 N+1 최적화:** `api/codes/[code]/route.ts:11-30` — 단일 Include 쿼리로 seller status 포함 조회 ✅
- **코드 형식 일관성:** `lib/code-generator.ts:17` — `AAA-MMDD-XXXX` 형식(대시 포함) 생성, buyer 랜딩에서 동일 형식으로 API 호출 → DB 조회 정상 ✅
- **정산 크론 인증:** `api/cron/settlements/route.ts:10-15` — `CRON_SECRET` Bearer 토큰 인증 ✅
- **정산 settlementId FK:** `api/cron/settlements/route.ts:79-83` — Order.settlementId 연결 정상 ✅
- **관리자 정산 배치 버튼:** `api/admin/settlements/route.ts:27-36` — 서버사이드에서 CRON_SECRET 헤더 추가 후 cron API 호출 ✅
- **전화번호 서버 검증:** `sellers/register/route.ts:28-33`, `payments/confirm/route.ts:35-41` — 정규식 검증 정상 ✅
- **정산 상세 드릴다운:** `components/seller/SettlementDetailDrawer.tsx` + `api/seller/settlements/[id]/route.ts` — sellerId 소유권 확인, Sheet 슬라이드아웃 정상 ✅
- **관리자 환불 UI:** `components/admin/RefundDialog.tsx` + `api/admin/orders/[id]/refund/route.ts` — 환불 가능 상태 검증(PAID/SHIPPING/DELIVERED), pgTid 확인, PortOne 환불 API 호출, 감사 로그 기록 ✅
- **셀러 대시보드 실데이터:** `api/seller/dashboard/route.ts:36-46` — 최근 주문 5건 실데이터 표시 ✅
- **승인 확인 버튼 (B-18):** `seller/dashboard/page.tsx:62-78` — 승인 시 `signOut` 자동 로그아웃 후 재로그인 유도 ✅

---

## 버그 / 이슈

### 신규 발견 — 배포 전 처리 필요

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| B-23 | **HIGH** | UX-2 QR 코드 미구현 | `qrcode` 패키지 미설치(`package.json` 확인). 커밋 c0bb241에서 완료 표시되었으나 실제 구현 없음. `codes/new/page.tsx` 발급 완료 화면에 QR 없음, `codes/page.tsx` 목록에 QR 열 없음, buyer 랜딩에 QR 스캔 버튼 없음, `/order/[code]` 라우트 없음 | `app/seller/codes/new/page.tsx:74-107`, `package.json` |
| B-24 | **HIGH** | 환불 API 환경변수 배포 누락 위험 | `api/admin/orders/[id]/refund/route.ts:63`에서 `PORTONE_API_SECRET` 사용. PLAN.md 배포 체크리스트에는 `PORTONE_API_KEY`만 있어 `PORTONE_API_SECRET` 누락 시 환불 기능이 프로덕션에서 502 오류 발생 | `app/api/admin/orders/[id]/refund/route.ts:63`, `liveorder-team/PLAN.md:2.3절` |
| B-25 | **MED** | 정산 테이블 `colSpan` 불일치 | `settlements/page.tsx:166` — `colSpan={7}`이지만 실제 테이블 헤더는 8열(정산예정일, 거래금액, 플랫폼수수료, PG수수료, 실지급액, 상태, 정산일, 상세보기). "정산 내역 없음" 메시지가 마지막 1열을 채우지 못함 | `app/seller/settlements/page.tsx:166` |
| B-26 | **MED** | 코드 발급 드롭다운에 soft-deleted 상품 표시 | `api/seller/products/route.ts:12-16` GET에 `isActive: true` 필터 없음. 셀러가 삭제한 상품이 `/seller/codes/new` 드롭다운에 표시되어 발급 시도 시 404 오류 발생 | `app/api/seller/products/route.ts:12` |

### P2 — 이전 스프린트 수정 완료

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-06~~ | ~~LOW~~ | ~~정산 상세 없음~~ | ✅ **2026-04-03 완료** — SettlementDetailDrawer + `/api/seller/settlements/[id]` | `components/seller/SettlementDetailDrawer.tsx` |
| ~~B-07~~ | ~~LOW~~ | ~~환불 처리 미구현~~ | ✅ **2026-04-03 완료** — RefundDialog + 환불 API | `app/admin/orders/`, `components/admin/RefundDialog.tsx` |
| ~~B-16~~ | ~~HIGH~~ | ~~관리자 정산 배치 버튼 인증 실패~~ | ✅ **2026-04-02 수정** | `app/api/admin/settlements/route.ts` |
| ~~B-17~~ | ~~MED~~ | ~~비활성 상품에 코드 발급 가능~~ | ✅ **2026-04-02 수정** | `app/api/seller/codes/route.ts:49` |
| ~~B-18~~ | ~~MED~~ | ~~셀러 승인 후 JWT 세션 미갱신~~ | ✅ **2026-04-03 완료** | `app/seller/dashboard/page.tsx:62-78` |
| ~~B-19~~ | ~~LOW~~ | ~~연락처 서버 검증 없음~~ | ✅ **2026-04-03 완료** | `app/api/sellers/register/route.ts:28-33` |
| ~~B-20~~ | ~~LOW~~ | ~~정산 배치 alert() UX~~ | ✅ **2026-04-03 완료** | `app/admin/settlements/page.tsx` |

### P1 — 이전 스프린트 수정 완료

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-01~~ | ~~HIGH~~ | ~~정산 크론 인증 없음~~ | ✅ **2026-04-02 수정** | `app/api/cron/settlements/route.ts` |
| ~~B-02~~ | ~~HIGH~~ | ~~동시 주문 레이스 컨디션~~ | ✅ **2026-04-02 수정** | `app/api/payments/confirm/route.ts` |
| ~~B-15~~ | ~~HIGH~~ | ~~결제 우회 엔드포인트~~ | ✅ **2026-04-02 수정** — `app/api/orders/route.ts` 삭제 | 삭제됨 |

### P3 — MVP 이후

| # | 내용 |
|---|------|
| B-10 | Redis 캐싱 미구현 |
| B-11 | 이메일 알림 없음 (주문 접수, 정산 완료 알림) |
| B-12 | 택배사 API 배송 추적 없음 |
| B-13 | 셀러 대시보드 차트 없음 |
| B-14 | CSV 대용량 처리 (페이지네이션 없음) |
| B-21 | 전체 목록 API 페이지네이션 없음 |

---

## 미구현 기능

| 기능 | 기획 여부 | 상태 |
|------|-----------|------|
| UX-2 QR 코드 생성 (코드 발급 후 즉시 표시) | 기획서 명시 | **미구현** — B-23 |
| 환불 UI (관리자) | 기획서 명시 | ✅ 완료 (2026-04-03, P2-1) |
| 정산 상세 드릴다운 | 기획서 명시 | ✅ 완료 (2026-04-03, Task 19) |
| 셀러 이메일 인증 | 기획서 명시 | Phase 3 예정 |
| 구매자 데이터 삭제권 (GDPR) | 개인정보법 요구 | Phase 3 예정 |

---

## 기술 부채

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| `/api/seller/products` GET — `isActive` 필터 누락 | MED | ⚠️ B-26 신규 발견 |
| `SettlementDetailDrawer` fetch 에러 시 사용자 피드백 없음 | LOW | 미처리 (`.catch(() => {})`) |
| `admin/orders/page.tsx` 로딩 상태 없음 | LOW | 미처리 |
| `RefundDialog` 성공 후 `handleClose` 대신 `onClose` 직접 호출 | LOW | 미처리 (상태 초기화 우회) |
| buyer-store 타입 안전성 (`Record<string, unknown>`) | LOW | 미처리 |
| API 전체 페이지네이션 없음 (B-21) | MED | Phase 3 계획 |

---

## 검증 필요 항목 (수동 QA)

| # | 항목 | 상태 |
|---|------|------|
| QA-1 | 결제 플로우: PortOne 테스트 결제창 → 서버 검증 → 주문 DB 생성 | 🔄 수동 검증 필요 |
| QA-2 | 운송장 등록: PAID 주문 → Dialog → 제출 → SHIPPING 전환 | 🔄 수동 검증 필요 |
| QA-3 | 관리자 승인: 셀러 "승인 확인" 버튼 → 자동 로그아웃 → 재로그인 → PENDING 배너 사라짐 | 🔄 수동 검증 필요 |
| QA-4 | 정산 크론: `POST /api/cron/settlements` (Bearer $CRON_SECRET) → Settlement 생성 + SETTLED 전환 | 🔄 수동 검증 필요 |
| QA-5 | 미들웨어: 비로그인 `/seller/dashboard` 접근 → `/seller/auth/login` 리다이렉트 | 🔄 수동 검증 필요 |
| QA-6 | 이미지 업로드: 5MB 초과 → 오류 메시지, 정상 이미지 → Vercel Blob URL 저장 | 🔄 수동 검증 필요 |

---

## 배포 가능 기준

Phase 1 MVP 배포 가능 기준:
- [x] 핵심 플로우 전체 구현 완료 (QR 제외)
- [x] T-08: debug 엔드포인트 제거 ✅
- [x] T-09: 상품 이미지 업로드 (Vercel Blob) ✅
- [x] B-01: 정산 크론 인증 ✅
- [x] B-02: 동시 주문 레이스 컨디션 수정 ✅
- [x] B-15: `/api/orders` 결제 우회 엔드포인트 제거 ✅
- [x] B-16: 관리자 정산 배치 버튼 인증 수정 ✅
- [ ] **B-23: UX-2 QR 코드 미구현 — 배포 전 결정 필요** (MVP에서 제외 또는 구현)
- [ ] **B-24: `PORTONE_API_SECRET` Vercel 환경변수 추가 — 배포 전 필수**
- [ ] **B-25: 정산 테이블 colSpan=8 수정 — 간단 버그픽스**
- [ ] **B-26: `/api/seller/products` isActive 필터 추가 — 간단 버그픽스**
- [ ] 수동 QA 6개 항목 통과 ← Task 12

---

## 환경변수 최종 체크리스트 (배포 전)

| 변수명 | 용도 | 상태 |
|--------|------|------|
| `DATABASE_URL` | Neon PostgreSQL | PLAN.md 기재 |
| `NEXTAUTH_SECRET` | JWT 서명 | PLAN.md 기재 |
| `PORTONE_API_KEY` | PortOne V2 API 키 | PLAN.md 기재 |
| `PORTONE_STORE_ID` | PortOne 상점 ID | PLAN.md 기재 |
| `PORTONE_API_SECRET` | PortOne 환불 API 인증 | **⚠️ PLAN.md 누락 — 추가 필요** |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | PLAN.md 기재 |
| `CRON_SECRET` | 정산 크론 Bearer 토큰 | PLAN.md 기재 |
| `NEXTAUTH_URL` | 프로덕션 URL | PLAN.md 기재 |
