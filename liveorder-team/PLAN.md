# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-10 (Task 63 완료 확인, Task 64 스펙 수립: 이상 거래 모니터링 시스템)_

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
| Phase 3 — 확장 | 🔧 진행 중 (Task 64 진행) |
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
| 56 | 셀러 상품 활성/비활성 토글 — `POST /api/seller/products/[id]/toggle` + `?status` 필터 + 목록/상세 토글 버튼 |
| 57 | 셀러 코드 목록 상태 필터 + 검색 — `GET /api/seller/codes` `?status` + `?q` 파라미터 + 필터 탭 + 검색창 |
| 58 | 셀러 코드 상세 QR 코드 표시/다운로드 + `GET /api/seller/codes/[id]/orders/export` 코드별 주문 CSV 다운로드 |
| 59 | 셀러 주문 날짜 범위/상품 필터 — `?from=`, `?to=`, `?productId=` 파라미터 + CSV 필터링 + 날짜/상품 UI |
| 60 | 관리자 정산 페이지 개선 — `GET /api/admin/settlements` 페이지네이션 + 날짜/상태/셀러 필터 + CSV 내보내기 + UI |
| 61 | 관리자 셀러 목록 고도화 — `GET /api/admin/sellers` 서버사이드 페이지네이션 + 검색(이름/이메일/사업자번호) + `GET /api/admin/sellers/export` CSV 내보내기 |
| 62 | 관리자 주문 검색 + 날짜 범위 필터 + CSV 내보내기 — `GET /api/admin/orders` `?q=`, `?from=`, `?to=` + `GET /api/admin/orders/export` + UI |
| 63 | 셀러 이용약관 전자서명 동의 완성 — `Seller.termsAgreedAt` DB 추가 + 회원가입 API 저장 + `/seller-terms` 판매자 약관 페이지 + 관리자 셀러 상세 약관 동의 날짜 표시 |

---

## Task 64 — 이상 거래 모니터링 시스템

### 배경

기획서 3.3절 "이상 거래 모니터링"에 명시된 보안 기능. 라이브 방송 특성상 단시간에 대량 주문이 몰리며 봇/어뷰징에 취약하다. 현재 세 가지 공백:

1. **IP 미기록**: Order 모델에 `buyerIp` 필드 없음. 동일 IP 다수 주문 감지 불가.
2. **코드 검증 무제한**: `GET /api/codes/[code]` 에 rate limiting 없음. 봇이 무한 코드 스캐닝 가능.
3. **모니터링 UI 없음**: 관리자가 의심 주문 패턴을 실시간으로 확인할 방법 없음. QA_REPORT 권고사항이기도 함.

### 목표

- `Order` DB에 구매자 IP 저장 (Prisma migration)
- 결제 확인 API에서 IP 추출 + 저장
- 코드 검증 API에 IP 기반 1분/10회 rate limiting
- 관리자 `/admin/fraud` 이상 거래 모니터링 페이지

### 구현 파일

| 서브태스크 | 파일 | 작업 |
|-----------|------|------|
| 64A | `prisma/schema.prisma` + migration | `Order`에 `buyerIp String?` 추가 |
| 64B | `app/api/payments/confirm/route.ts` | 결제 시 `x-forwarded-for` → `buyerIp` 저장 |
| 64C | `app/api/codes/[code]/route.ts` | 모듈 수준 in-memory Map으로 IP rate limiting |
| 64D | `app/api/admin/fraud/route.ts` | 신규: 동일IP 5건↑ + 동일전화 고액 3건↑ 집계 |
| 64D | `app/admin/fraud/page.tsx` | 신규: 이상 거래 모니터링 페이지 |
| 64D | `app/admin/layout.tsx` | 사이드바에 "🚨 이상 거래" 메뉴 추가 |

### 레이아웃

#### `/admin/fraud`
```
┌──────────────────────────────────────────────────────────┐
│ 이상 거래 모니터링                        [새로고침]       │
│                                                           │
│ ⚠️ 동일 IP 다수 주문 (최근 1시간, 5건 이상)               │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ IP            주문수  첫 주문     마지막 주문         │  │
│ │ 1.2.3.4       8건    14:20:01  14:22:33  [주문 보기] │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ ⚠️ 단시간 고액 주문 (최근 30분, 3건↑ + 합계 30만원↑)     │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ 전화번호        주문수  총 금액    [주문 보기]         │  │
│ │ 010-****-1234  4건    580,000원  [주문 보기]          │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ 의심 건 없으면: "현재 이상 거래 패턴이 감지되지 않았습니다."│
└──────────────────────────────────────────────────────────┘
```

### API 명세

**`GET /api/admin/fraud`** — admin 세션 필수

응답:
```json
{
  "suspiciousIps": [
    {
      "buyerIp": "1.2.3.4",
      "orderCount": 8,
      "firstAt": "2026-04-10T14:20:01Z",
      "lastAt": "2026-04-10T14:22:33Z",
      "orderIds": ["uuid1", "uuid2", ...]
    }
  ],
  "suspiciousPhones": [
    {
      "buyerPhone": "010-1234-5678",
      "orderCount": 4,
      "totalAmount": 580000,
      "firstAt": "...",
      "lastAt": "...",
      "orderIds": [...]
    }
  ]
}
```

### 주의사항

- 64A migration: `nullable`이므로 기존 주문 데이터 영향 없음 (기존 주문은 `buyerIp = null`)
- 64B: Vercel 환경에서 실제 IP는 `x-forwarded-for` 첫 번째 값. `req.ip`는 Vercel Edge Runtime에서만 동작
- 64C: in-memory Map은 Vercel cold start 시 초기화됨 → MVP 수준 보호 (Redis 없이). 데이터-삭제 API 동일 패턴
- 64D: `buyerIp`가 null인 기존 주문은 동일 IP 집계에서 제외됨 (`WHERE buyer_ip IS NOT NULL`)
- 64D: `$queryRaw` 결과 BigInt → number 변환 필요 (`COUNT(*)::int` 캐스팅으로 해결)
- 64D: 전화번호 마스킹은 프론트에서 처리 (`phone.replace(/(\d{3})-\d{4}-(\d{4})/, '$1-****-$2')`)
- "[주문 보기]" 링크: IP 패턴은 `/admin/orders?q={ip}`, 전화번호는 `/admin/orders?q={phone}`

---

## Task 63 — 셀러 이용약관 전자서명 동의 완성

### 배경

현재 셀러 회원가입 페이지(`/seller/auth/register`)에 이용약관 동의 체크박스가 있지만, **동의 여부가 DB에 저장되지 않는다**. 세 가지 문제:

1. **동의 기록 없음**: 분쟁 발생 시 "언제 어떤 약관에 동의했는지" 증명 불가. 전자상거래법·개인정보보호법상 서비스 제공자는 동의 일자를 보관할 의무가 있음.
2. **약관 페이지 부재**: 체크박스가 링크하는 `/seller-terms` 페이지가 없어 404. 구매자 약관(`/terms`)은 있지만 판매자 약관 페이지는 미구현.
3. **관리자 확인 불가**: 관리자가 셀러 상세 페이지에서 약관 동의 날짜를 볼 수 없음.

기획서 3.1.1절에 "셀러 이용약관 전자서명 동의"가 명시되어 있으며, QA_REPORT에서도 미구현으로 기록됨.

### 목표

- Prisma migration: `Seller`에 `termsAgreedAt DateTime?` 추가
- 회원가입 API: 약관 동의 시 `termsAgreedAt` = 현재 시각 저장
- `/seller-terms` 판매자 이용약관 페이지 신규 생성
- 관리자 셀러 상세 페이지: 약관 동의 날짜 표시

### 구현 파일

| 서브태스크 | 파일 | 작업 |
|-----------|------|------|
| 63A | `prisma/schema.prisma` + migration | `Seller`에 `termsAgreedAt DateTime?` 추가 |
| 63B | `app/api/sellers/register/route.ts` | 요청 body에서 `termsAgreed` 확인 + `termsAgreedAt: new Date()` 저장 |
| 63C | `app/seller-terms/page.tsx` | 판매자 이용약관 페이지 신규 (정적 콘텐츠) |
| 63D | `app/admin/sellers/[id]/page.tsx` | 약관 동의 날짜 표시 (없으면 "미동의" 배지) |

### 레이아웃

#### 회원가입 API (63B)

```typescript
// app/api/sellers/register/route.ts 수정
// body에 termsAgreed: boolean 추가 검증

const { ..., termsAgreed } = await req.json()
if (!termsAgreed) {
  return NextResponse.json({ error: '이용약관 동의가 필요합니다.' }, { status: 400 })
}

await prisma.seller.create({
  data: {
    ...,
    termsAgreedAt: new Date(),
  },
})
```

#### 판매자 이용약관 페이지 (63C)

```
/seller-terms
┌──────────────────────────────────────────────────────────┐
│ LiveOrder 판매자 이용약관                                  │
│                                                           │
│ 제1조 (목적)                                              │
│ 제2조 (서비스 정의)                                        │
│ 제3조 (판매자 의무)                                        │
│ 제4조 (수수료 및 정산)                                     │
│ 제5조 (금지 행위)                                          │
│ 제6조 (계약 해지)                                          │
│ 제7조 (면책조항)                                           │
│                                                           │
│ 시행일: 2026-04-10                                        │
└──────────────────────────────────────────────────────────┘
```

#### 관리자 셀러 상세 (63D)

```
기본 정보 섹션에 추가:
약관 동의: 2026-04-10 14:23  (또는 "미동의" 오렌지 배지)
```

### Prisma Schema 변경 (63A)

```prisma
model Seller {
  ...
  termsAgreedAt      DateTime? @map("terms_agreed_at") @db.Timestamptz
  ...
}
```

Migration 명령:
```bash
npx prisma migrate dev --name add_terms_agreed_at_to_sellers
```

### 주의사항

- 63A migration은 `nullable`이므로 기존 셀러 데이터에 영향 없음
- 63B: `termsAgreed: true`가 body에 없거나 false면 400 반환 (서버 측 검증 필수)
- 63C: 정적 페이지 — app router, no `'use client'` 필요. SEO를 위해 metadata 설정
- 63D: `GET /api/admin/sellers/[id]` 응답에 `termsAgreedAt` 포함되어 있는지 확인 후 표시
- 기존 회원가입 폼 체크박스(`/seller/auth/register/page.tsx`)는 이미 `disabled={loading || !termsAgreed || !sellerTermsAgreed}` 로 UI 검증됨 — API 측 검증 추가가 핵심

---

## Task 62 — 관리자 주문 검색 + 날짜 범위 필터 + CSV 내보내기 ✅ 완료

### 배경

현재 관리자 주문 목록(`/admin/orders`)은 상태 필터 + 페이지네이션이 구현돼 있으나, 세 가지 공백이 있다:

1. **검색 없음**: 구매자 이름이나 전화번호로 특정 주문을 빠르게 찾을 수 없음. 현재는 페이지를 스크롤하면서 육안 확인만 가능.
2. **날짜 범위 필터 없음**: 특정 기간(예: 지난 주 라이브 방송 기간) 주문만 모아보는 것이 불가능. 정산 배치 결과 확인, 배송 처리 기간 구분 시 불편.
3. **CSV 내보내기 없음**: 관리자가 전체 주문 내역을 회계 처리나 분석 목적으로 추출하려면 수동 복사 필요.

관리자 정산(Task 60), 관리자 셀러(Task 61)에는 동일 기능이 이미 완비됨. 주문 페이지만 남아 있어 일관성 확보 필요.

### 목표

- `GET /api/admin/orders`에 `?q=` 검색(구매자명/전화번호) + `?from=`, `?to=` 날짜 필터 추가
- `GET /api/admin/orders/export` 신규 CSV 내보내기 API
- `/admin/orders` 페이지에 검색창 + 날짜 입력 + CSV 버튼 추가

### 구현 파일

| 서브태스크 | 파일 | 작업 |
|-----------|------|------|
| 62A | `app/api/admin/orders/route.ts` | GET 수정: `?q=`, `?from=`, `?to=` 파라미터 추가 |
| 62B | `app/api/admin/orders/export/route.ts` | 신규: CSV 내보내기 API |
| 62C | `app/admin/orders/page.tsx` | 검색창 + 날짜 필터 + CSV 버튼 추가 |

### 레이아웃

```
/admin/orders
┌──────────────────────────────────────────────────────────┐
│ 주문 관리                              [CSV 내보내기]      │
│                                                           │
│ [🔍 구매자명/전화번호 검색...]                             │
│ [시작일: ____-__-__]  [종료일: ____-__-__]  [초기화]      │
│ [전체 ▼] (상태 Select — 기존 유지)                        │
│                                                           │
│ (주문 테이블)                                             │
│                                                           │
│ ← 이전   1 / N 페이지  (총 N건)   다음 →                  │
└──────────────────────────────────────────────────────────┘
```

### 주의사항

- 62A: `parsePagination` / `buildPaginationResponse`는 `lib/pagination.ts` 기존 구현 사용
- 62B: `export` 경로 `app/api/admin/orders/export/route.ts` — 기존 `[id]` 경로와 충돌 없음 (정적 > 동적 우선)
- 62C: `fetchOrders` useCallback deps에 `search`, `fromDate`, `toDate` 추가 필수
- Order 모델의 구매자 전화번호 필드명 확인 (`prisma/schema.prisma`) 후 정확한 필드명 사용
- 날짜 필터 기준: `createdAt` (주문 생성일)
- 파일명: `orders_{from}_{to}.csv`

---

## Task 61 — 관리자 셀러 목록 고도화: 검색 + 페이지네이션 + CSV 내보내기

### 배경

현재 관리자 셀러 목록(`/admin/sellers`)의 세 가지 공백:

1. **전체 로드**: `GET /api/admin/sellers`가 페이지네이션 없이 모든 셀러를 반환. 셀러가 쌓일수록 성능 저하.
2. **검색 없음**: 특정 셀러를 이름/이메일/사업자번호로 빠르게 찾을 수 없음. 현재는 스크롤 탐색만 가능.
3. **상태 필터가 클라이언트에서만 처리**: `PENDING/APPROVED/SUSPENDED` 탭이 있지만 전체 데이터를 받아 클라이언트에서 필터링 — 서버 부담.
4. **CSV 내보내기 없음**: 셀러 관리·감사·세금 처리를 위한 목록 추출 불가. 수동 복사 필요.

### 목표

- `GET /api/admin/sellers`에 페이지네이션 + 검색 + 상태 필터 추가 (서버사이드)
- `GET /api/admin/sellers/export` 신규 CSV 다운로드 API
- `/admin/sellers` 페이지에 검색창 + 페이지네이션 + CSV 버튼 추가

### 구현 파일

| 서브태스크 | 파일 | 작업 |
|-----------|------|------|
| 61A | `app/api/admin/sellers/route.ts` | GET 수정: 페이지네이션 + 검색 + 상태 필터 |
| 61B | `app/api/admin/sellers/export/route.ts` | 신규: CSV 내보내기 API |
| 61C | `app/admin/sellers/page.tsx` | 검색창 + 페이지네이션 + CSV 버튼 |

### 레이아웃

```
/admin/sellers
┌──────────────────────────────────────────────────────────┐
│ 셀러 관리                              [CSV 내보내기]      │
│                                                           │
│ [🔍 이름/이메일/사업자번호 검색...]                        │
│ [전체] [승인대기] [승인완료] [정지]                        │
│                                                           │
│ (셀러 테이블)                                             │
│                                                           │
│ ← 이전   1 / 5 페이지  (총 N건)   다음 →                  │
└──────────────────────────────────────────────────────────┘
```

### 주의사항

- `parsePagination` / `buildPaginationResponse`는 `lib/pagination.ts` 기존 구현 사용
- 61A API 응답 형식 `[]` → `{ data, pagination }` 변경 — 61C 동시 수정 필수
- `export` 경로: `app/api/admin/sellers/export/route.ts` — Next.js에서 정적 경로가 동적 `[id]`보다 우선하므로 충돌 없음
- 기존 `PATCH /api/admin/sellers/[id]` 영향 없음 (별도 파일)
- 기존 승인/거부/정지 기능(상태 변경 버튼) 그대로 유지

---

## Task 60 — 관리자 정산 페이지 개선: 필터 + 페이지네이션 + CSV 내보내기

### 배경

현재 관리자 정산 페이지(`/admin/settlements`)의 세 가지 공백:

1. **데이터 전체 로드**: `GET /api/admin/settlements`가 페이지네이션 없이 전체 정산을 반환. 정산이 쌓일수록 성능 저하.
2. **날짜 필터 없음**: 상태 탭(대기/완료/실패)만 있고, 특정 기간 정산 조회 불가.
3. **CSV 내보내기 없음**: 회계/세금 처리를 위해 정산 내역을 엑셀로 추출해야 하지만 기능 없음. 수동 복사해야 함.

### 목표

- `GET /api/admin/settlements`에 페이지네이션 + 날짜/셀러 필터 추가
- `GET /api/admin/settlements/export` 신규 CSV 다운로드 API
- `/admin/settlements` 페이지에 날짜 필터 + 페이지네이션 + CSV 버튼 추가

### 구현 파일

| 서브태스크 | 파일 | 작업 |
|-----------|------|------|
| 60A | `app/api/admin/settlements/route.ts` | GET 수정: 페이지네이션 + 날짜/상태/셀러 필터 |
| 60B | `app/api/admin/settlements/export/route.ts` | 신규: CSV 내보내기 API |
| 60C | `app/admin/settlements/page.tsx` | 날짜 필터 UI + 페이지네이션 + CSV 버튼 |

### 레이아웃

```
/admin/settlements
┌──────────────────────────────────────────────────────────┐
│ 정산 관리              [정산 배치 실행]  [CSV 내보내기 ▼] │
│                                                           │
│ [시작일: ____-__-__]  [종료일: ____-__-__]  [초기화]     │
│ [전체] [대기] [완료] [실패]                               │
│                                                           │
│ (정산 테이블)                                             │
│                                                           │
│ ← 이전   1 / 3 페이지  (총 52건)  다음 →                 │
└──────────────────────────────────────────────────────────┘
```

### 주의사항

- `parsePagination` / `buildPaginationResponse`는 `lib/pagination.ts` 기존 구현 사용
- 60A API 응답 형식 `[]` → `{ data, total, page, limit, totalPages }` 변경 — 60C 동시 수정 필수
- `POST /api/admin/settlements` (배치 실행)는 같은 파일에 있으므로 그대로 유지
- 날짜 필터 기준: `scheduledAt` (정산 예정일)
- export 파일명: `settlements_{from}_{to}_{날짜}.csv`

---

## Task 59 — 셀러 주문 날짜 범위 필터 + 상품 필터 + CSV 필터링

### 배경

현재 셀러 주문 목록(`/seller/orders`)에서 필터 기능의 두 가지 공백:

1. **날짜 범위 필터 없음**: 셀러가 특정 날짜의 라이브 방송 주문만 추려 배송지를 준비하고 싶을 때 방법 없음. 상태/검색 필터만 있고 날짜 기준 조회 불가.
2. **상품별 필터 없음**: 여러 상품을 운영하는 셀러가 특정 상품의 주문만 볼 수 없음.
3. **전체 CSV 내보내기가 필터를 무시**: 현재 주문 목록에 상태/검색 필터를 적용해도 "CSV 다운로드" 버튼은 항상 전체 주문을 내려받음. 필터 조건 그대로 내보내기 불가.

### 목표

- `GET /api/seller/orders`에 `?from=`, `?to=`, `?productId=` 파라미터 추가
- `GET /api/seller/orders/export`도 동일 파라미터 지원 + 파일명에 날짜 범위 반영
- `/seller/orders` 페이지에 날짜 범위 입력 + 상품 드롭다운 추가
- CSV 다운로드 버튼이 현재 필터 상태를 그대로 export URL에 전달

### 레이아웃 변경

```
/seller/orders
┌──────────────────────────────────────────────────────────┐
│ 주문 관리                        [CSV ▼][운송장 일괄 업로드] │
│                                                           │
│ [시작일: ____-__-__]  [종료일: ____-__-__]  [전체 상품 ▼] │  ← 신규
│ [검색창]  [PAID] [배송중] [배송완료] ...                   │
│                                                           │
│ (기존 주문 테이블)                                          │
└──────────────────────────────────────────────────────────┘
```

### 서브태스크

#### 59A: `GET /api/seller/orders` — `?from=`, `?to=`, `?productId=` 추가

**수정 파일:** `app/api/seller/orders/route.ts`

날짜 범위와 상품 ID 필터를 기존 `where` 구성에 병합. productId는 `code.product.id`로 조건 추가.

#### 59B: `GET /api/seller/orders/export` — 동일 필터 파라미터 지원

**수정 파일:** `app/api/seller/orders/export/route.ts`

`GET()` → `GET(req: NextRequest)` 변경 후 59A와 동일한 필터 로직 적용. 파일명에 날짜 범위 반영.

#### 59C: `/seller/orders` — 날짜 범위 입력 + 상품 드롭다운 추가

**수정 파일:** `app/seller/orders/page.tsx`

- 마운트 시 상품 목록 로드 (`/api/seller/products?status=all&limit=100`)
- `fromDate`, `toDate`, `productId` 상태 추가
- `fetchOrders` 파라미터 확장 (하위 호환 유지)
- 날짜 입력 + 상품 Select + "필터 초기화" 버튼 UI 추가
- 30초 자동갱신 useEffect도 의존성에 날짜/상품 추가

#### 59D: CSV 다운로드 버튼 → 현재 필터 반영

**수정 파일:** `app/seller/orders/page.tsx`

`handleExport` (또는 기존 다운로드 로직)에서 현재 필터를 URL 파라미터로 전달. 필터 있을 때 버튼 텍스트 "필터 조건으로 CSV 내보내기"로 변경.

### 구현 순서

59A → 59B → 59C → 59D

### 주의사항

- `products` 드롭다운에 `status=all` 사용 — 비활성 상품 주문도 조회 가능해야 함
- 날짜 input은 네이티브 `<input type="date">` 사용 — 추가 패키지 불필요
- `fromDate`/`toDate`가 30초 자동갱신 useEffect 의존성에도 포함되어야 함
- `fetchOrders` 시그니처 확장 시 기존 호출부(3개 인자)와 하위 호환 필요

---

## Task 58 — 셀러 코드 상세 QR 코드 + 코드별 주문 CSV 다운로드

### 배경

현재 셀러 코드 상세 페이지(`/seller/codes/[id]`)의 두 가지 기능 공백:

1. **QR 코드 재조회 불가**: QR은 코드 생성 직후(`/seller/codes/new`)에만 표시됨. 이후 다시 QR이 필요하면 재조회 방법 없음. 라이브 방송 시작 직전 방송 화면에 QR을 띄우려면 상세 페이지에서 바로 저장할 수 있어야 함.
2. **코드별 배송지 다운로드 불가**: 현재 `/api/seller/orders/export`는 셀러 전체 주문 일괄 다운로드만 지원. 방송 회차별(코드별)로 배송지 추출이 필요한 셀러는 전체 CSV에서 수동 필터링해야 하는 불편함.

### 목표

- 코드 상세 페이지에서 QR 코드 이미지를 표시하고 PNG로 다운로드
- 해당 코드의 주문만 CSV로 다운로드하는 API + 버튼 추가

### 레이아웃 변경

```
/seller/codes/[id]
┌──────────────────────────────────────────────────────────┐
│ 코드 정보 카드                                              │
│   codeKey: K9A-2503-X7YZ                                 │
│   상품: 제품명                                             │
│   [QR 코드 이미지 256×256]  ← 신규                        │
│   [⬇ QR 저장]              ← 신규                        │
├──────────────────────────────────────────────────────────┤
│ 주문 목록 (N건)  [⬇ 주문 다운로드]  ← 신규 버튼            │
│ (기존 주문 테이블 그대로)                                    │
└──────────────────────────────────────────────────────────┘
```

### 서브태스크

#### 58A: `/seller/codes/[id]` — QR 코드 섹션 추가

**수정 파일:** `app/seller/codes/[id]/page.tsx`

- `import QRCode from 'qrcode'` — 기존 `/seller/codes/new/page.tsx`에서 사용 중인 패키지
- `import { Download } from 'lucide-react'` — 58C에서도 동일 사용
- `useState<string>('')` 로 qrDataUrl 관리
- `useEffect(() => { QRCode.toDataURL(orderUrl, { width: 256, margin: 2 }).then(setQrDataUrl) }, [data])`
- orderUrl: `${window.location.origin}/order/${data.code.codeKey}`
- 코드 정보 카드 내 codeKey 표시 아래에 QR 이미지 + "QR 저장" 링크 추가

#### 58B: `GET /api/seller/codes/[id]/orders/export` 신규 API

**신규 파일:** `app/api/seller/codes/[id]/orders/export/route.ts`

- 소유 검증: code의 product.sellerId === session.user.id
- 해당 codeId 주문만 조회 (take: 10000)
- UTF-8 BOM + CSV 생성
- 파일명: `orders_{codeKey}_{YYYY-MM-DD}.csv`
- 컬럼: 주문ID, 주문일시, 수령인, 연락처, 주소, 상세주소, 배송메모, 수량, 금액, 상태, 운송장, 주문경로

#### 58C: `/seller/codes/[id]` — "주문 다운로드" 버튼 추가

**수정 파일:** `app/seller/codes/[id]/page.tsx`

- 주문 테이블 CardTitle 옆에 "주문 다운로드" 버튼
- `exporting` 상태로 로딩 스피너 처리
- 주문 0건이면 disabled
- 성공/실패 toast

### 구현 순서

58B (API 신규) → 58A (QR 추가) → 58C (다운로드 버튼)

### 주의사항

- `qrcode` 패키지 이미 설치돼 있음 (`/seller/codes/new/page.tsx`에서 사용 중)
- `Download` 아이콘을 58A + 58C 양쪽에서 사용 — import 한 번만
- 신규 API 경로: `app/api/seller/codes/[id]/orders/export/route.ts` (기존 `app/api/seller/codes/[id]/route.ts`와 충돌 없음)

---

## Task 57 — 셀러 코드 목록 상태 필터 + 검색

### 배경

현재 셀러 코드 관리에서 일관성 부재 및 UX 문제가 있다:

1. **상품 목록과 불일치**: 상품 목록(`/seller/products`)은 Task 56에서 `?status` 필터가 추가되었으나, 코드 목록(`/seller/codes`)은 전체를 한 번에 반환 (isActive/만료/소진 구분 없음)
2. **검색 불가**: 코드가 많아지면 특정 코드를 찾기 어려움. 상품명 또는 코드키로 검색 기능 없음
3. **만료 코드 방치**: 만료된 코드들이 목록에 섞여 있어 활성 코드 파악이 어려움

### 목표

- 코드 목록에 상태 필터(활성/만료/중지/전체) 탭 추가
- 코드키 또는 상품명으로 검색 기능 추가
- `GET /api/seller/codes`에 `?status` + `?q` 파라미터 지원

### 상태 구분 기준

```
active   = isActive: true AND expiresAt > now AND (maxQty=0 OR usedQty < maxQty)
expired  = expiresAt <= now  (isActive 무관)
inactive = isActive: false AND expiresAt > now
all      = 필터 없음
```

> 참고: "소진" (maxQty>0 && usedQty>=maxQty) 상태는 `active` 필터에서 제외 (별도 탭 없음 — 소진은 "만료"와 유사한 비활성 상태로 처리)

### 레이아웃 변경

```
/seller/codes
┌──────────────────────────────────────────────┐
│ 내 코드  [+ 코드 발급]                         │
│ [🔍 검색창 (코드키/상품명)]                     │
│ [활성] [만료] [중지] [전체]  ← 신규 필터 탭     │
├──────────────────────────────────────────────┤
│ (기존 테이블 그대로)                             │
└──────────────────────────────────────────────┘
```

### 서브태스크

#### 57A: `GET /api/seller/codes` — `?status` + `?q` 파라미터 지원

**수정 파일:** `app/api/seller/codes/route.ts`

```typescript
// status 파라미터 처리
const status = searchParams.get('status') ?? 'all'
const q = searchParams.get('q')?.trim() ?? ''
const now = new Date()

// status에 따른 where 조건
// active: isActive=true, expiresAt > now, (maxQty=0 OR usedQty < maxQty)
// expired: expiresAt <= now
// inactive: isActive=false, expiresAt > now
// all: 필터 없음

const statusFilter =
  status === 'active'   ? { isActive: true, expiresAt: { gt: now }, OR: [{ maxQty: 0 }, { usedQty: { lt: prisma.code.fields.maxQty } }] } :
  status === 'expired'  ? { expiresAt: { lte: now } } :
  status === 'inactive' ? { isActive: false, expiresAt: { gt: now } } :
  {}

// 검색 필터
const searchFilter = q ? {
  OR: [
    { codeKey: { contains: q, mode: 'insensitive' } },
    { product: { name: { contains: q, mode: 'insensitive' } } },
  ]
} : {}

const where = {
  product: { sellerId: session.user.id },
  ...statusFilter,
  ...searchFilter,
}
```

**주의사항:**
- `active` 상태의 `usedQty < maxQty` 조건은 Prisma에서 필드 비교가 복잡하므로, `maxQty: 0` (무제한) 또는 Raw SQL 사용
- 실제 구현에서는 `active` 필터를 단순화: `isActive: true, expiresAt: { gt: now }` (소진 여부는 프론트에서 뱃지로 표시)
- `mode: 'insensitive'` — Prisma PostgreSQL 검색 대소문자 무시

**완료 조건:**
- [ ] `?status=active` → isActive=true + expiresAt > now 코드만
- [ ] `?status=expired` → expiresAt <= now 코드만
- [ ] `?status=inactive` → isActive=false + expiresAt > now 코드만
- [ ] `?status=all` (또는 기본) → 전체
- [ ] `?q=검색어` → codeKey 또는 상품명 포함 코드 필터
- [ ] 기존 페이지네이션 동작 유지

---

#### 57B: `/seller/codes` 목록 페이지 — 상태 필터 탭 + 검색창 추가

**수정 파일:** `app/seller/codes/page.tsx`

**추가 상태:**
```typescript
const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'inactive' | 'all'>('active')
const [search, setSearch] = useState('')
const [searchInput, setSearchInput] = useState('')
```

**검색 디바운스 (300ms):**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setSearch(searchInput)
    setPage(1)
  }, 300)
  return () => clearTimeout(timer)
}, [searchInput])
```

**fetch URL 수정:**
```typescript
fetch(`/api/seller/codes?page=${page}&status=${statusFilter}&q=${encodeURIComponent(search)}`)
```

**필터 탭 + 검색창 UI (테이블 위에 추가):**
```tsx
{/* 검색창 */}
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="코드 또는 상품명 검색..."
    className="pl-9"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
</div>

{/* 상태 필터 탭 */}
<div className="flex gap-2">
  {(['active', 'expired', 'inactive', 'all'] as const).map((s) => (
    <Button
      key={s}
      variant={statusFilter === s ? 'default' : 'outline'}
      size="sm"
      onClick={() => { setStatusFilter(s); setPage(1); }}
    >
      {s === 'active' ? '활성' : s === 'expired' ? '만료' : s === 'inactive' ? '중지' : '전체'}
    </Button>
  ))}
</div>
```

**빈 상태 메시지 (statusFilter + search 기준):**
```tsx
{codes.length === 0 && (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
      {search
        ? `"${search}"에 해당하는 코드가 없습니다.`
        : statusFilter === 'active'
        ? '활성 코드가 없습니다.'
        : statusFilter === 'expired'
        ? '만료된 코드가 없습니다.'
        : statusFilter === 'inactive'
        ? '중지된 코드가 없습니다.'
        : '발급된 코드가 없습니다.'}
    </TableCell>
  </TableRow>
)}
```

**import 추가:**
```typescript
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
```
(Input은 이미 import돼 있을 수 있음 — 중복 확인)

**완료 조건:**
- [ ] 검색창 — 코드키 또는 상품명으로 300ms 디바운스 검색
- [ ] 상태 필터 탭 4개 (활성/만료/중지/전체) — 기본 '활성'
- [ ] 탭/검색 변경 시 page=1로 리셋 + 목록 재조회
- [ ] 빈 상태 메시지 (필터/검색에 맞는 메시지 표시)
- [ ] 기존 테이블/페이지네이션 그대로 유지

---

### 구현 순서

57A (API 수정) → 57B (UI 수정)

### 주의사항

- 기존 코드 목록은 상태 필터 없이 전체를 반환하므로, **기존 동작 변경**: 기본값을 `'active'`로 설정
  - 단, 기존에 코드 목록 페이지를 자주 보는 셀러가 있을 수 있으므로 'all' 탭도 명시적으로 제공
- `?status=active` 기본으로 바꾸면 만료/중지 코드는 기본적으로 안 보임 → 사용자에게 탭 안내 중요
- 57B에서 `Input`이 이미 import되어 있는지 확인 후 처리
- 검색 `q` 파라미터는 빈 문자열이면 전송 안 해도 됨 (`q=` 생략 또는 `q=` 빈값 모두 처리)

---

*최종 업데이트: 2026-04-09 (Planner)*
