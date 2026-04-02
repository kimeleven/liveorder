# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-02 (PM)

---

## ✅ Dev1 완료 — Phase 1 마무리 + P2 버그 수정

### Task 10: 카테고리 미선택 UX 피드백 개선 (B-03) ✅ 완료 (2026-04-02)

**파일:** `app/seller/products/new/page.tsx`

**완료 내용:**
- `categoryError` state 추가
- `handleSubmit`에서 `category` 미선택 시 조기 반환 + `setCategoryError("카테고리를 선택해 주세요.")`
- Select `onValueChange`에서 에러 초기화
- Select 아래 에러 메시지 표시 + 빨간 테두리

---

### Task 11: 연락처 형식 검증 추가 (B-04) ✅ 완료 (2026-04-02)

**파일:** `components/buyer/cards/AddressForm.tsx`

**완료 내용:**
- `phoneError` state 추가
- 제출 시 정규식 검증: `/^01[0-9]-\d{3,4}-\d{4}$/`
- 오류 시 필드 아래 안내 메시지 표시 + 빨간 테두리
- 입력 변경 시 에러 초기화
- placeholder `"010-1234-5678"` 추가

---

### Task 12: 수동 QA 6개 항목 통과 지원

QA_REPORT.md의 "검증 필요 항목" 6개를 로컬/스테이징 환경에서 확인 후 결과 기록.
각 항목 통과 시 QA_REPORT.md "검증 필요 항목" 옆에 ✅ 표기.

배포 가능 기준 마지막 항목 (`[ ] 수동 QA 6개 항목 통과`) 완료 시 → PM에게 보고.

---

## 버그 수정 ✅ (2026-04-02)

### B-01: 정산 크론 인증 추가 ✅
`app/api/cron/settlements/route.ts` — `CRON_SECRET` 환경변수 기반 Bearer 토큰 인증.
설정된 경우 `Authorization: Bearer <CRON_SECRET>` 헤더 없으면 401 반환.

### B-02: 동시 주문 레이스 컨디션 수정 ✅
`app/api/payments/confirm/route.ts` — 수량 초과 검사를 트랜잭션 외부 read-check에서
트랜잭션 내부 원자적 `UPDATE ... WHERE (maxQty=0 OR usedQty+qty <= maxQty) RETURNING id`로 교체.
0 rows 반환 시 QUANTITY_EXCEEDED 에러로 400 응답.

---

## 완료된 P2 작업 ✅

### Task 8: debug 엔드포인트 제거 (보안) ✅ 완료
`app/api/debug/route.ts` 삭제. 참조 파일 없음 확인. 보안 위험 제거.

### Task 9: 상품 이미지 업로드 (Vercel Blob) ✅ 완료
**완료 내용:**
- `@vercel/blob` 설치
- `app/api/seller/products/upload/route.ts` — 업로드 API (인증 + 타입/용량 검증, 5MB 제한)
- `app/seller/products/new/page.tsx` — 이미지 선택 UI (미리보기 + X 제거 버튼)
- `app/seller/products/[id]/edit/page.tsx` — 수정 시 기존 이미지 표시 + 교체
- `app/api/seller/products/[id]/route.ts` — PUT에 imageUrl 필드 추가
- `components/buyer/cards/ProductCard.tsx` — imageUrl 있으면 이미지, 없으면 placeholder
- `next.config.ts` — Vercel Blob 도메인 허용 (`*.public.blob.vercel-storage.com`)

**환경변수 필요:** `BLOB_READ_WRITE_TOKEN` (Vercel Storage → Blob 연결 후 발급)

---

## 완료된 P0 작업 ✅ (커밋: afc5b54, 2026-04-02)

### Task 1: 운송장 등록 UI ✅
`app/seller/orders/page.tsx` — Dialog (택배사 + 운송장번호), PAID/SHIPPING 상태 전용 버튼

### Task 2: 코드 발급 API 보안 ✅
POST `/api/codes` → `/api/seller/codes` 이동. 프론트엔드 URL 수정.

### Task 3: 셀러 PENDING 상태 차단 ✅
상품 등록/코드 발급 API에 APPROVED 검증. 대시보드 PENDING 배너.

### Task 4: 개인정보 제3자 제공 동의 ✅
`AddressForm.tsx` — 수집·이용 + 제3자 제공 동의 체크박스 (미체크 시 제출 불가)

---

## 완료된 P1 작업 ✅ (커밋: cad9243, 2026-04-02)

### Task 5: OrderStatus DELIVERED 추가 ✅
- `prisma/schema.prisma` + 마이그레이션 (`20260402000001_add_delivered_status`)
- `app/seller/orders/page.tsx` + `app/(buyer)/lookup/page.tsx` — statusMap/Label 업데이트

### Task 6: 상품 수정/삭제 ✅
- `app/api/seller/products/[id]/route.ts` — GET, PUT, DELETE (soft delete)
- `app/seller/products/[id]/edit/page.tsx` — 수정 페이지
- `app/seller/products/page.tsx` — 수정/삭제 버튼

### Task 7: 셀러 정산 페이지 ✅
`app/seller/settlements/page.tsx` — 기존 구현 확인 완료. 목록 + 상태 필터 + 합계 카드.

---

## 완료된 인프라 작업 ✅

- [x] Next.js 16 + TypeScript + Tailwind 프로젝트 초기화
- [x] Prisma 스키마 설계 (Admin, Seller, Product, Code, Order, Settlement, AuditLog)
- [x] Neon HTTP 어댑터 연동
- [x] NextAuth v5 셀러/관리자 이중 인증
- [x] 미들웨어 JWE 토큰 복호화 (HKDF)
- [x] 셀러 회원가입 / 로그인
- [x] 관리자 로그인
- [x] 상품 등록/목록 (`app/seller/products/`)
- [x] 코드 발급/관리 (`app/seller/codes/`)
- [x] 구매자 코드 입력 랜딩
- [x] 구매자 채팅 UI + Zustand 스토어
- [x] PortOne 결제 연동 + 서버 검증
- [x] 주문 생성 트랜잭션
- [x] 주문 조회 (비회원, 전화번호+주문번호)
- [x] 셀러 주문 관리 + CSV 다운로드
- [x] 셀러 대시보드 통계
- [x] 관리자 셀러 승인/거부/정지 + 감사 로그
- [x] 관리자 정산 조회
- [x] 정산 크론 잡 (D+3)
- [x] 이용약관 + 개인정보처리방침
- [x] 법적 중개자 고지문
- [x] bcrypt 비용 최적화
- [x] 미들웨어 번들 최적화
- [x] auth() 레이아웃 리다이렉트 루프 수정
