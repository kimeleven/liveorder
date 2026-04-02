# LIVEORDER QA 리포트

> 최종 업데이트: 2026-04-02
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
| ADMIN | 정산 처리 (크론) | ✅ | D+3 자동 정산, 수동 트리거 가능 |

---

## 정상 동작 확인

- **미들웨어 인증:** `/seller/*`, `/admin/*`, `/api/seller/*`, `/api/admin/*` 전 경로 JWT 검증 확인 (`middleware.ts:38-70`)
- **결제 보안:** `payments/confirm/route.ts` — PortOne 서버 검증, 금액 대조, 코드 유효성 재확인, 트랜잭션 처리 정상
- **개인정보 동의:** `AddressForm.tsx:148-155` — 두 체크박스 모두 체크 시에만 제출 버튼 활성화
- **PENDING 셀러 차단:** `seller/products/route.ts:27-32` — 상품 등록 시 APPROVED 상태 확인 (403 반환)
- **디버그 엔드포인트:** `/app/api/debug/` 디렉토리 없음 — T-08 완료 확인 ✅
- **이미지 업로드:** `seller/products/new/page.tsx` Vercel Blob 업로드 UI, 미리보기, X 버튼 구현 — T-09 완료 확인 ✅
- **감사 로그:** `admin/sellers/[id]/route.ts` — 상태 변경마다 `SellerAuditLog` 기록
- **정산 계산:** 플랫폼 수수료 2.5% + PG 수수료 2.2%, 트랜잭션 내 Settlement 생성 + 주문 SETTLED 전환

---

## 버그 / 이슈

### P1 — 배포 전 처리 권고

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| ~~B-01~~ | ~~HIGH~~ | ~~정산 크론 인증 없음~~ | ✅ **2026-04-02 수정** — `CRON_SECRET` 환경변수 기반 Bearer 토큰 인증 추가. 미설정 시 경고 없이 통과하지 않도록 방어 처리. | `app/api/cron/settlements/route.ts` |
| ~~B-02~~ | ~~HIGH~~ | ~~동시 주문 레이스 컨디션~~ | ✅ **2026-04-02 수정** — 수량 검사를 트랜잭션 내부의 원자적 조건부 `UPDATE ... WHERE ... RETURNING id`로 교체. 동시 요청 시 한 건만 성공 보장. | `app/api/payments/confirm/route.ts` |

### P2 — 다음 스프린트

| # | 우선순위 | 기능 | 내용 | 위치 |
|---|----------|------|------|------|
| B-03 | MED | 카테고리 필수 검증 UX | 상품 등록 폼에서 카테고리 미선택 시 shadcn Select의 `required`가 브라우저 네이티브 팝업 없이 서버 오류 반환. 서버 검증은 정상이나 클라이언트 피드백 부재 | `app/seller/products/new/page.tsx:181`, `app/api/seller/products/route.ts:38-43` |
| B-04 | MED | 연락처 형식 미검증 | 배송지 입력 폼 전화번호 필드가 `type="tel"`만 있고 형식 검증(01X-XXXX-XXXX) 없음. 잘못된 번호로 주문 생성 시 주문 조회 불가 | `components/buyer/cards/AddressForm.tsx:80-87` |
| B-05 | MED | 코드 검증 N+1 쿼리 | 코드 유효성 API에서 seller 정보를 include로 받아온 후 status만 위해 별도 쿼리 실행 | `app/api/codes/[code]/route.ts:60-72` |
| B-06 | LOW | 정산 상세 없음 | 정산 목록은 있으나 정산 건별 포함 주문 내역 없음 | `app/seller/settlements/page.tsx` |
| B-07 | LOW | 환불 처리 미구현 | 관리자 환불 UI 없음. 현재 수동 처리 | `app/admin/` |
| B-08 | LOW | 채팅 오류 재시도 없음 | 코드 검증 또는 결제 실패 시 재시도 버튼 없음 | `app/(buyer)/chat/page.tsx:103-109` |
| B-09 | LOW | 결제 후 새 코드 입력 버튼 없음 | 주문 완료 후 "새 코드 입력하기" 버튼 미구현 | `components/buyer/cards/OrderConfirmation.tsx` |

### P3 — MVP 이후

| # | 내용 |
|---|------|
| B-10 | Redis 캐싱 미구현 (기획서 명시, MVP 이후 고려) |
| B-11 | 이메일 알림 없음 (주문 접수, 정산 완료 알림) |
| B-12 | 택배사 API 배송 추적 없음 (수동 운송장 입력만 가능) |
| B-13 | 셀러 대시보드 차트 없음 |
| B-14 | CSV 주문 내보내기 — 페이지네이션 없음 (대용량 시 메모리 이슈 가능) |

---

## 미구현 기능

| 기능 | 기획 여부 | 상태 |
|------|-----------|------|
| 환불 UI (관리자) | 기획서 명시 | Phase 2 예정 |
| 정산 상세 드릴다운 | 기획서 명시 | Phase 2 예정 |
| 셀러 이메일 인증 | 기획서 명시 | Phase 2 예정 |
| 구매자 데이터 삭제권 (GDPR) | 개인정보법 요구 | 미반영 |

---

## 기술 부채

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| `/api/cron/settlements` 인증 추가 | HIGH (배포 전) | ✅ 완료 |
| 동시 주문 레이스 컨디션 방지 (트랜잭션 내 수량 검증) | HIGH | ✅ 완료 |
| `.env.example` PortOne 변수 추가 | MEDIUM | 미처리 |
| `/api/codes/[code]` seller status 쿼리 최적화 | LOW | 미처리 |
| buyer-store 타입 안전성 (`Record<string, unknown>` 개선) | LOW | 미처리 |

---

## 검증 필요 항목 (수동 QA)

1. **결제 플로우:** PortOne 테스트 결제창 호출 → 서버 검증 → 주문 생성 확인
2. **운송장 등록:** 주문 PAID 상태 → 운송장 Dialog → 제출 → SHIPPING 전환 확인
3. **관리자 승인:** 셀러 회원가입 → 관리자 로그인 → 승인 → 셀러 대시보드 PENDING 배너 사라짐
4. **정산 크론:** Vercel Cron 또는 수동 트리거 → Settlement 레코드 생성 + 주문 SETTLED 확인
5. **미들웨어 인증:** 비로그인 상태에서 `/seller/dashboard` 직접 접근 시 로그인으로 리다이렉트
6. **이미지 업로드:** 5MB 초과 파일 업로드 시 오류 메시지 표시, 정상 이미지 Vercel Blob URL 저장 확인

---

## 배포 가능 기준

Phase 1 MVP 배포 가능 기준:
- [x] 핵심 플로우 15단계 모두 ✅
- [x] T-08: debug 엔드포인트 제거 ✅ (2026-04-02)
- [x] T-09: 상품 이미지 업로드 (Vercel Blob) ✅ (2026-04-02)
- [x] B-01: 정산 크론 인증 (CRON_SECRET Bearer) ✅ (2026-04-02)
- [x] B-02: 동시 주문 레이스 컨디션 수정 ✅ (2026-04-02)
- [ ] **수동 QA 6개 항목 통과** ← 현재 진행 중
