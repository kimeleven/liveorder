# LIVEORDER 개발 계획서

> 최종 업데이트: 2026-04-09 (Planner — Task 34 미구현 확인, Phase 4 카카오톡 챗봇 주문 시스템 기획)
> 현재 단계: **Task 34 착수 대기 + Phase 4 카카오톡 챗봇 연동 계획**
> 팀 재가동: 2026-04-09 (Paused → Active)

---

## 1. Phase 1 + 2 완료 현황 ✅

모든 코드 구현 및 QA 완료.

### 구현 완료 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로젝트 인프라 (Next.js 16 + Prisma + Neon + Vercel) | ✅ | |
| DB 스키마 (Admin, Seller, Product, Code, Order, Settlement, AuditLog) | ✅ | settlementId FK 포함 |
| 셀러 회원가입 / 로그인 | ✅ | |
| 관리자 로그인 | ✅ | |
| 미들웨어 인증 (쿠키 존재 여부 체크) | ✅ | |
| 상품 등록/수정/삭제/목록 + 코드 자동 발급 (UX-1) | ✅ | soft delete, autoCode 포함 |
| 상품 이미지 업로드 (Vercel Blob) | ✅ | 5MB 제한 |
| 코드 발급/관리 + API 보안 + QR 생성 (UX-2) | ✅ | qrcode 라이브러리, QR 다운로드 |
| QR 스캔 → `/order/[code]` 자동 코드 입력 | ✅ | |
| 셀러 PENDING 차단, 비활성 상품 코드 발급 차단 | ✅ | |
| 구매자 코드 입력 → 채팅 플로우 | ✅ | |
| PortOne 결제 연동 + 서버 검증 + 레이스 컨디션 방지 | ✅ | 원자적 UPDATE |
| 주문 조회 (비회원, 전화번호+주문번호) | ✅ | |
| 배송지 입력 + 개인정보 동의 체크박스 | ✅ | |
| 셀러 주문 관리 + CSV 다운로드 (UTF-8 BOM, 10000건 상한) | ✅ | |
| 운송장 등록 UI (Dialog) + DELIVERED 상태 | ✅ | PAID→SHIPPING→DELIVERED |
| 셀러 대시보드 (통계 카드 + 7일 매출 차트 + 최근 주문) | ✅ | recharts |
| 셀러 대시보드 승인 확인 버튼 | ✅ | 승인 시 자동 로그아웃 |
| 셀러 정산 페이지 (목록 + 필터 + 합계 + 상세 드릴다운) | ✅ | SettlementDetailDrawer |
| 관리자 셀러 승인/거부/정지 + 감사 로그 | ✅ | |
| 관리자 정산 조회 + 배치 버튼 (CRON_SECRET 인증) | ✅ | |
| 관리자 주문 목록 + 환불 UI (부분/전액) | ✅ | RefundDialog |
| 정산 크론 (D+3, settlementId FK 연결, DELIVERED 포함) | ✅ | |
| 셀러 이메일 인증 (24시간 만료 토큰) | ✅ | |
| 청약확인 UI + 청약철회 신청 (전자상거래법 준수) | ✅ | |
| 개인정보 삭제 API (rate limiting, 마스킹) | ✅ | |
| API 페이지네이션 공통화 | ✅ | lib/pagination.ts |
| 배송 추적 링크 (6개 택배사) | ✅ | lib/carrier-urls.ts |
| 보안: debug 제거, 결제 우회 제거, 전화번호 검증 | ✅ | |
| pgTid unique 제약 + 환불 상태 처리 | ✅ | |

---

## 2. 현재 진행: Phase 3 잔여 + Phase 4

### 2.1 Task 34: 사업자등록증 이미지 업로드 ⬜ 미구현

**우선순위:** MED — Phase 4 착수 전 완료 권장
**배경:** 셀러 신뢰도 검증을 위한 기획서 3.1.1절 필수 요건

현재 상태 (2026-04-09 확인):
- `prisma/schema.prisma`: `bizRegImageUrl` 필드 없음
- `app/api/seller/biz-reg-upload/route.ts`: 미존재
- `app/seller/auth/register/page.tsx`: 업로드 UI 없음
- `app/api/sellers/register/route.ts`: bizRegImageUrl 처리 없음
- `app/admin/sellers/page.tsx`: 사업자등록증 컬럼 없음

**구현 순서 (6 steps):**

#### Step 1: `prisma/schema.prisma` 수정
`tradeRegNo` 필드(line 38) 바로 아래에 추가:
```prisma
bizRegImageUrl String? @map("biz_reg_image_url") // 사업자등록증 이미지 (Vercel Blob)
```
마이그레이션:
```bash
npx prisma migrate dev --name add_biz_reg_image
```

#### Step 2: `app/api/seller/biz-reg-upload/route.ts` 신규 생성
`app/api/seller/products/upload/route.ts` 패턴 참조:
- filename: `biz-reg/${session.user.id}/${Date.now()}.${ext}`
- allowedTypes: `image/jpeg, image/png, image/webp, image/gif, application/pdf` (PDF 포함)
- status 체크 없음 (PENDING 셀러도 업로드 가능 — 회원가입 직후)

#### Step 3: `app/seller/auth/register/page.tsx` 수정
- state 추가: `bizRegImageUrl`, `bizRegUploading`, `bizRegFileName`
- 업로드 핸들러 `handleBizRegUpload` 추가
- handleSubmit에 `!bizRegImageUrl` 검증 추가
- JSX에 파일 input 컴포넌트 추가 (bankAccount 입력 아래)

#### Step 4: `app/api/sellers/register/route.ts` 수정
- destructuring에 `bizRegImageUrl` 추가
- 필수 검증에 `!bizRegImageUrl` 포함
- `prisma.seller.create` data에 `bizRegImageUrl` 추가

#### Step 5: `app/api/admin/sellers/route.ts` 수정
- `select`에 `bizRegImageUrl: true` 추가

#### Step 6: `app/admin/sellers/page.tsx` 수정
- `SellerItem` 인터페이스에 `bizRegImageUrl?: string | null` 추가
- 테이블에 "사업자등록증" 컬럼 추가 (링크 또는 "미첨부" 표시)

**커밋:** `feat: Task 34 — 사업자등록증 이미지 업로드 (Vercel Blob)`

---

### 2.2 Phase 4: 카카오톡 챗봇 주문 시스템 🆕

> **재가동 배경:** 2026-04-09 LiveOrder v3 재가동. 카카오톡 채널을 통해 라이브 커머스 구매자가 코드를 입력하고 주문/결제를 완료하는 챗봇 플로우 구축.

**핵심 가치:** 구매자가 liveorder.kr에 접속하지 않고 카카오톡 채널에서 바로 코드 입력 → 주문 완료

#### Phase 4 서비스 플로우

```
[셀러] 기존과 동일: 상품 등록 + 코드 발급
         ↓
[셀러] 라이브 방송 중 코드 + 카카오톡 채널 링크 공지
         ↓
[구매자] 카카오톡 채널 친구 추가 → 코드 입력
         ↓
[챗봇] 코드 유효성 검증 → 상품 정보 카드 메시지 전송
         ↓
[구매자] 수량 선택 → 결제 링크 수신 (웹 결제 페이지로 연결)
         ↓
[구매자] 결제 완료 → 배송지 입력 → 주문 확정
         ↓
[챗봇] 주문 완료 알림 메시지 전송
```

#### Task 35: 카카오 비즈니스 메시지 웹훅 API

**신규 파일:**
- `app/api/kakao/webhook/route.ts` — 카카오 챗봇 웹훅 수신 + 응답
- `lib/kakao.ts` — 카카오 채널 메시지 발송 유틸
- `app/api/kakao/payment-link/route.ts` — 결제 링크 생성 API

**환경변수 추가 (Vercel):**
```
KAKAO_CHANNEL_ID          # 카카오 채널 ID
KAKAO_REST_API_KEY        # 카카오 REST API 키
KAKAO_BIZMSG_ACCESS_TOKEN # 카카오 비즈니스 메시지 액세스 토큰 (철수토큰)
```

**웹훅 처리 로직:**
1. 카카오에서 POST /api/kakao/webhook 수신
2. 사용자 발화 텍스트 파싱 (코드 형식 AAA-0000-XXXX 감지)
3. 코드 유효성 검증 (`GET /api/codes/[code]` 내부 호출)
4. 상품 정보 카드 메시지 응답
5. 결제 링크 생성 (단기 세션 토큰 포함 URL)

**카드 메시지 스펙:**
```typescript
// 상품 정보 카드
{
  type: "basicCard",
  title: product.name,
  description: `가격: ₩${price.toLocaleString()}\n재고: ${stock > 0 ? stock : '무제한'}`,
  thumbnail: { imageUrl: product.imageUrl },
  buttons: [
    { label: "수량 선택 후 결제", action: "webLink", webLinkUrl: paymentUrl }
  ]
}
```

#### Task 36: 카카오 결제 연결 웹 페이지

**신규 파일:** `app/(buyer)/kakao/[token]/page.tsx`

기능:
- 카카오 챗봇에서 발급한 단기 토큰으로 접근
- 토큰 → 상품/코드 정보 조회
- 수량 선택 후 기존 PortOne 결제 플로우 연결
- 토큰 만료 시간: 30분

**토큰 저장:** `KakaoPaySession` 모델 추가 (prisma) 또는 Vercel KV

---

## 3. 배포 체크리스트 (Task 14)

### 3.1 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `DATABASE_URL` | Neon PostgreSQL | ✅ |
| `NEXTAUTH_SECRET` | JWT 서명 키 (32자 이상) | ✅ |
| `PORTONE_API_KEY` | PortOne V2 API 키 | ✅ |
| `PORTONE_STORE_ID` | PortOne 상점 ID | ✅ |
| `PORTONE_API_SECRET` | PortOne 환불 인증 | ✅ |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | ✅ |
| `CRON_SECRET` | 정산 크론 Bearer | ✅ |
| `NEXTAUTH_URL` | 프로덕션 URL | ✅ |
| `RESEND_API_KEY` | 이메일 알림 | ✅ |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | PortOne 클라이언트 | ✅ |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | PortOne 채널 키 | ✅ |
| `ADMIN_EMAIL` | 관리자 알림 수신 (미설정 시 admin@liveorder.app) | 선택 |
| `KAKAO_CHANNEL_ID` | 카카오 채널 ID (Phase 4) | Phase 4 필수 |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 (Phase 4) | Phase 4 필수 |
| `KAKAO_BIZMSG_ACCESS_TOKEN` | 카카오 비즈메시지 토큰 (Phase 4) | Phase 4 필수 |

### 3.2 배포 후 스모크 테스트

1. 셀러 회원가입 (사업자등록증 포함) → 관리자 승인 → 상품 등록 → 코드 발급
2. 구매자 코드 입력 → PortOne 테스트 결제 → 주문 생성 확인
3. 셀러 주문 확인 → 운송장 등록 → SHIPPING 전환
4. `POST /api/cron/settlements` → Settlement 생성
5. (Phase 4) 카카오 채널에서 코드 입력 → 상품 정보 수신 → 결제 링크 클릭

---

## 4. 미구현 기능 (장기 백로그)

| 기능 | 우선순위 | 비고 |
|------|---------|------|
| 1원 인증 (정산 계좌 본인인증) | LOW | 계좌 정보 수집만 |
| 통신판매업신고번호 공공 API 검증 | LOW | 형식 수집만 |
| CS 티켓 관리 | LOW | |
| 이상 거래 모니터링 | LOW | IP 기반 rate limiting 부분 적용됨 |
| Redis 캐싱 (코드 유효성) | LOW | |
| 구매자 선택적 회원가입 | LOW | Phase 2 |
| 운송장 일괄 CSV 업로드 | LOW | |
| 주별/월별 매출 차트 | LOW | |
| 번들 코드 (여러 상품 묶음) | LOW | Phase 3 |
| 불법 상품 AI 키워드 필터 | LOW | Phase 2 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-04-09 | Phase 4 카카오톡 챗봇 주문 시스템 기획 추가. Task 34 미구현 상태 재확인. 팀 재가동. |
| 2026-04-03 | Task 33 완료 (청약확인/청약철회). Task 34 스펙 수립. |
| 2026-04-03 | Task 28~32 완료. HIGH/MED QA 버그 전체 수정. |
