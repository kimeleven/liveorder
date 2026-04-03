# QA Report - 2026-04-03

> QA Engineer: Claude Sonnet 4.6
> 검토 범위: Phase 1 ~ Phase 3 전체 (최신 커밋 d939b28 기준)
> 검토 방법: 소스 코드 직접 열람 + 기획서/PLAN/TASKS 대조
> 업데이트: 2026-04-03 (Task 31 완료 확인, Task 32/33 미구현 코드 직접 검증)

---

## 정상 동작 확인

- [BUYER 코드 입력]: `app/(buyer)/page.tsx` — 코드 포맷 자동 처리(AAA-0000-XXXX), API 호출 후 sessionStorage 전달 정상
- [BUYER QR 스캔]: `app/(buyer)/order/[code]/page.tsx` — QR 링크 진입 시 자동 코드 검증 후 `/chat` 리다이렉트 정상
- [BUYER 채팅 플로우]: `chat/page.tsx` + `buyer-store.ts` — 플로우 스텝 관리(idle→product_shown→quantity_selected→address_entry→payment_pending→complete) 정상. sessionStorage JSON.parse try/catch 적용됨(B-27)
- [BUYER 배송지 입력]: `AddressForm.tsx` — 개인정보 수집 동의 + 제3자 제공 동의 체크박스 양식 모두 required 처리 후 버튼 활성화, 전화번호 형식 프론트 검증 정상
- [BUYER 결제]: `PaymentSummary.tsx` — PortOne SDK 동적 로드, 결제창 호출, 서버 검증 API 호출 정상. 통신판매중개업자 고지 문구 포함됨(법적 의무 충족)
- [BUYER 주문 조회]: `lookup/page.tsx` + `app/api/orders/[id]/route.ts` — 전화번호+주문번호 조회 정상. 운송장 있을 때 배송 추적 링크 표시 정상(P3-4)
- [SELLER 회원가입]: `app/api/sellers/register/route.ts` — 이메일/사업자번호 중복 체크, 전화번호 형식 검증, 이메일 인증 토큰 생성 + 인증 메일 발송, 관리자 알림 메일 발송 정상
- [SELLER 로그인 차단]: `lib/auth.ts:29-31` — `emailVerified === false`이면 throw Error로 로그인 차단(B-31) 정상
- [SELLER 이메일 인증]: `app/api/seller/auth/verify/route.ts` — 토큰 조회, 만료 시간 24h 검증(B-32), 인증 완료 처리, 결과 페이지 리다이렉트 정상
- [SELLER 이메일 재발송]: `app/api/seller/auth/verify/resend/route.ts` — 이메일 존재 여부 노출 없이 처리(보안 고려됨) 정상
- [SELLER 상품 등록]: `app/api/seller/products/route.ts` — APPROVED 셀러만 가능, 상품 등록 후 코드 자동 발급(UX-1) 정상. 자동 발급 실패 시 상품 등록 유지
- [SELLER 상품 목록]: `GET /api/seller/products` — `isActive: true` 필터 적용(B-26), 페이지네이션 표준 적용(P3-1) 정상
- [SELLER 코드 발급]: `app/api/seller/codes/route.ts` — APPROVED 체크, 비활성 상품 발급 차단, 중복 방지 재시도(max 10회) 정상
- [SELLER 코드 토글]: `app/api/seller/codes/[id]/toggle/route.ts` — 셀러 소유 확인 후 isActive 토글 정상
- [SELLER 주문 목록]: `app/seller/orders/page.tsx` + `app/api/seller/orders/route.ts` — 페이지네이션, **상태 필터(Task 31 완료)**, Skeleton 로딩(Task 30 완료), 에러 배너(Task 30 완료) 정상
- [SELLER 운송장 등록]: `app/api/seller/orders/[id]/tracking/route.ts` — 셀러 소유 확인, SHIPPING 상태 전환, 운송장/택배사 저장 정상
- [SELLER CSV 다운로드]: `app/api/seller/orders/export/route.ts` — UTF-8 BOM 포함, 전체 주문 내보내기 정상 (상한 제한 미적용 → Task 32 대상)
- [SELLER 정산 목록]: `app/api/seller/settlements/route.ts` — 셀러별 정산 목록 조회 정상
- [SELLER 정산 상세]: `SettlementDetailDrawer.tsx` — fetch 실패 시 에러 메시지 표시 정상
- [SELLER 대시보드]: `app/seller/dashboard/page.tsx` — 통계 카드, 7일 매출 recharts 라인차트(P3-3), 최근 주문 5건, 미인증 배너/재발송 버튼, 승인 대기 배너 정상. 에러 처리(Task 30 완료) 정상
- [SELLER 대시보드 dailySales]: `app/api/seller/dashboard/route.ts` — BigInt → number 변환 처리됨(JSON 직렬화 오류 방지) 정상
- [ADMIN 로그인]: `lib/auth.ts` admin-login credentials provider — 관리자 전용 인증 정상
- [ADMIN 셀러 승인/거부/정지]: `app/api/admin/sellers/[id]/route.ts` — PATCH, 감사 로그 기록, 승인/정지 시 이메일 알림(P3-2) 정상
- [ADMIN 주문 목록]: `app/admin/orders/page.tsx` + `app/api/admin/orders/route.ts` — 상태 필터, Skeleton 로딩(Task 28 완료) 정상
- [ADMIN 환불]: `RefundDialog.tsx` + `app/api/admin/orders/[id]/refund/route.ts` — 부분/전액 환불, PortOne API 연동, 감사 로그, 성공 후 상태 초기화(Task 28 완료) 정상
- [ADMIN 정산 배치]: `app/api/cron/settlements/route.ts` — CRON_SECRET Bearer 인증, D+3 정산, DELIVERED 포함(Task 28 완료), sellerId FK 연결 정상
- [미들웨어]: `middleware.ts` — HKDF JWE 복호화로 role 추출, /seller, /admin, /api/seller, /api/admin 경로 보호 정상
- [결제 원자성]: `app/api/payments/confirm/route.ts` — Raw SQL UPDATE in `$transaction` 으로 수량 race condition 방지, pgTid unique 중복 방지(Task 28 완료) 정상
- [코드 검증 API]: `app/api/codes/[code]/route.ts` — 5가지 검증(존재/isActive/만료/수량/셀러상태) 정상. 셀러 status 필드 응답 제외 정상
- [이메일 발송]: `lib/email.ts` — RESEND_API_KEY 없으면 조용히 무시, 실패해도 비즈니스 로직 영향 없음 정상
- [배송 추적 URL]: `lib/carrier-urls.ts` — 우체국택배 키 수정(B-30) 포함 6개 택배사 매핑 정상
- [개인정보 삭제 API]: `app/api/buyer/data-deletion/route.ts` — 이름+전화번호 매칭, 개인식별 정보 마스킹, 거래 기록 보존, IP 기반 rate limiting 1시간 5회(Task 31 완료) 정상
- [개인정보처리방침]: `app/(buyer)/terms/privacy/page.tsx` 및 `app/(buyer)/privacy/page.tsx` — 삭제 요청 링크(B-33 완료) 포함 정상
- [페이지네이션 공통]: `lib/pagination.ts` — parsePagination + buildPaginationResponse 표준화(P3-1). seller/orders, seller/products, seller/codes, admin/orders 적용 완료

---

## 버그/이슈

### 미해결 (잔존)

- [priority: LOW] [QuantitySelector maxQty 99 하드코딩]: `components/buyer/cards/QuantitySelector.tsx:17` — `remainingQty`가 null(무제한 코드)이면 `maxQty`를 99로 제한. 무제한 코드임에도 최대 99개만 선택 가능. → Task 32 대상. **코드 직접 확인: `const maxQty = (data.remainingQty as number | null) ?? 99;`**

- [priority: LOW] [CSV export 무제한 전량 조회]: `app/api/seller/orders/export/route.ts:11` — `take` 제한 없이 전체 조회. 주문 수만 건 이상 시 메모리/응답 타임아웃 가능. → Task 32 대상. **코드 직접 확인: `prisma.order.findMany({...})` — take 없음**

- [priority: LOW] [ADMIN_EMAIL 환경변수 폴백 도메인]: `lib/email.ts:21` — `ADMIN_EMAIL` 미설정 시 `admin@liveorder.app`으로 폴백. 해당 도메인 수신 설정 없으면 관리자 신규 가입 알림 전체 유실 가능

### 해결 완료 이력

- ~~[HIGH] pgTid unique 제약 없음~~ ✅ commit 1ddddfc (Task 28)
- ~~[HIGH] 부분 환불 후 주문 상태 오처리~~ ✅ commit 1ddddfc (Task 28)
- ~~[MED] 개인정보 삭제 API 인증 없음~~ ✅ commit b57439d (Task 31)
- ~~[MED] 정산 배치 SHIPPING/DELIVERED 주문 누락~~ ✅ commit 1ddddfc (Task 28)
- ~~[MED] terms/privacy 삭제 요청 링크 없음~~ ✅ commit 9b7adfe (B-33)
- ~~[MED] seller/orders 상태 필터 없음~~ ✅ commit b57439d (Task 31)
- ~~[MED] admin/orders 페이지네이션 비표준 응답~~ ✅ commit 1ddddfc (Task 28)
- ~~[MED] seller/orders fetch 에러 무시~~ ✅ commit 1ddddfc (Task 28)
- ~~[MED] 이메일 인증 토큰 만료 미검증~~ ✅ commit 1ee50ab (Task 29)
- ~~[LOW] seller/orders isLoading 상태 없음~~ ✅ commit 9ffc548 (Task 30)
- ~~[LOW] seller/dashboard fetch 에러 무시~~ ✅ commit 9ffc548 (Task 30)

---

## 미구현 기능

### 법적 의무 (배포 전 필수)

- [**HIGH**] [청약확인 UI — 전자상거래법 제13조]: `app/(buyer)/chat/page.tsx` — complete 단계에 청약확인 박스 없음. **코드 직접 확인: chat/page.tsx에 order-confirmation 타입 메시지 없음**. → Task 33 대상
- [**HIGH**] [청약철회 신청 API]: `app/api/orders/[id]/withdraw/route.ts` — 파일 자체 미존재. 결제 후 7일 이내 철회 신청 API 미구현. → Task 33 대상
- [**HIGH**] [청약철회 버튼 — lookup 페이지]: `app/(buyer)/lookup/page.tsx` — 주문 조회 결과에 청약철회 버튼 없음. **코드 직접 확인: PAID 상태 + 7일 이내 조건부 버튼 없음**. → Task 33 대상

### Phase 3 범위 외 (기획서 기준)

- [사업자등록증 이미지 업로드]: 기획서 3.1.1절 — 회원가입 필수 요건. 현재 미구현. Vercel Blob 인프라는 구축됨
- [1원 인증 (정산 계좌 본인인증)]: 기획서 3.1.1절 — 계좌 정보 수집만 함, 인증 미구현
- [통신판매업신고번호 공공 API 검증]: 기획서 3.1.1절 — 형식 수집만, 실제 유효성 API 검증 없음
- [셀러 이용약관 전자서명 동의]: 기획서 3.1.1절 — 동의 체크박스 미구현
- [CS 티켓 관리]: 기획서 3.1.3절 — CS 접수 현황 및 처리 내역 미구현
- [이상 거래 모니터링]: 기획서 3.3절 — 동일 IP 다수 주문, 단시간 고액거래 모니터링 미구현
- [불법 상품 AI 키워드 필터]: 기획서 3.3절 Phase 2 — AI 필터 미구현
- [Redis 캐싱]: 기획서 기술 스택 — 코드 유효성 Redis 캐싱 없음 (PLAN.md B-10 인식됨)
- [구매자 선택적 회원가입]: 기획서 Phase 2 — 구매자 주문 이력을 위한 선택적 회원가입 미구현
- [운송장 일괄 CSV 업로드]: 기획서 3.1.3절 — 운송장 개별 등록만 가능. 일괄 업로드 미구현
- [주별/월별 매출 차트]: 기획서 3.1.3절 — 셀러 대시보드 일별 7일만 구현. 주별/월별 뷰 없음
- [번들 코드 (여러 상품 묶음)]: 기획서 Phase 3 — 여러 상품 묶음 코드 미구현

---

## 권고사항

### 즉시 수정 (배포 전 블로커)

1. **Task 33 우선 완료 (법적 의무)**: 전자상거래법 제13조 위반. 청약확인 UI + 청약철회 API 3개 항목 모두 구현 필요. 배포 전 반드시 완료.

### 단기 수정 권장

2. **Task 32 완료**: QuantitySelector 99 → 999 + "(무제한)" 레이블, CSV export take:10000 상한 추가. LOW 우선순위이나 UX 개선 필요.
3. **ADMIN_EMAIL 환경변수 명시화**: Vercel 배포 체크리스트에 `ADMIN_EMAIL` 추가. 미설정 시 관리자 알림 유실 위험.
4. **rate limiting 지속성 개선**: `app/api/buyer/data-deletion/route.ts`의 in-memory Map은 Vercel 서버리스 cold start 시 초기화됨. Vercel KV 도입 검토 권장 (현재는 단순 스크립트 악용 방지 수준으로 MVP 운영 가능).

### 장기 개선 권장

5. **CSV export 스트리밍**: 대용량 주문 처리를 위한 스트리밍 응답 전환. 10,000건 상한이 단기 임시 대책.
6. **사업자등록증 이미지 업로드**: Vercel Blob 인프라 활용하여 회원가입 폼에 추가. 셀러 신뢰도 검증에 필요.
7. **이상 거래 모니터링**: 동일 IP 다수 주문 감지. 코드 검증 API에 IP 기반 rate limiting 추가 검토.

---

## 배포 전 환경변수 체크리스트

```
필수:
[ ] DATABASE_URL
[ ] NEXTAUTH_SECRET (32자 이상)
[ ] NEXTAUTH_URL (프로덕션 URL)
[ ] PORTONE_API_KEY
[ ] PORTONE_STORE_ID
[ ] PORTONE_API_SECRET (환불 필수)
[ ] BLOB_READ_WRITE_TOKEN
[ ] CRON_SECRET
[ ] RESEND_API_KEY (이메일 알림)

프론트엔드 (NEXT_PUBLIC):
[ ] NEXT_PUBLIC_PORTONE_STORE_ID
[ ] NEXT_PUBLIC_PORTONE_CHANNEL_KEY

선택:
[ ] ADMIN_EMAIL (미설정 시 admin@liveorder.app 폴백 — 수신 설정 확인 필요)
[ ] PLATFORM_FEE_RATE (미설정 시 0.025)
[ ] SETTLEMENT_DELAY_DAYS (미설정 시 3)
```

---

## 요약 지표

| 구분 | 건수 | 변동 |
|------|------|------|
| 정상 동작 확인 | 34건 | +2 (Task 31 완료 항목 반영) |
| 버그/이슈 — HIGH | 0건 | 유지 |
| 버그/이슈 — MED (미해결) | 0건 | 유지 |
| 버그/이슈 — LOW (미해결) | 3건 | 유지 (Task 32 대상 2건 + ADMIN_EMAIL 1건) |
| 법적 의무 미구현 (HIGH) | 3건 | 신규 — Task 33 대상 |
| 미구현 기능 (기획서 기준, Phase 3 외) | 12건 | - |
| 권고사항 | 7건 | 정리됨 (-9, 완료 항목 제거) |

**전반적 평가 (2026-04-03 최신):** Task 31 완료 코드 직접 검증 완료. 핵심 플로우(코드 입력→결제→주문→배송→정산) 전 단계 정상 동작. HIGH/MED 버그 전부 수정됨. **Task 33 청약확인/청약철회(전자상거래법 제13조)가 유일한 배포 블로커.** Task 32(LOW) 완료 후 Task 33 즉시 착수 필요.
