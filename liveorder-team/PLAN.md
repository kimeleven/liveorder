# LIVEORDER 개발 계획서

> 최종 업데이트: 2026-04-03 (PM 조율 — Task 19 완료 확인, Phase 1 QA + 배포 최종 단계)
> 현재 단계: **Phase 1 MVP — 수동 QA (Task 12) → Vercel 배포 (Task 14)**

---

## 1. Phase 1 MVP 완료 현황

### 구현 완료 기능 (전체)

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로젝트 인프라 (Next.js 16 + Prisma + Neon + Vercel) | ✅ | |
| DB 스키마 (Admin, Seller, Product, Code, Order, Settlement, AuditLog) | ✅ | settlementId FK 포함 |
| 셀러 회원가입 / 로그인 | ✅ | |
| 관리자 로그인 | ✅ | |
| 미들웨어 인증 (HKDF JWE 복호화) | ✅ | salt 버그 수정 완료 |
| 상품 등록/수정/삭제/목록 + 코드 자동 발급 (UX-1) | ✅ | soft delete, autoCode 포함 |
| 상품 이미지 업로드 (Vercel Blob) | ✅ | 5MB 제한 |
| 코드 발급/관리 + API 보안 | ✅ | `/api/seller/codes` |
| 코드 발급 시 QR코드 생성 (UX-2) | ✅ | `qrcode` 라이브러리, QR 다운로드 |
| 셀러 PENDING 차단 | ✅ | 상품/코드 API |
| 비활성 상품 코드 발급 차단 (B-17) | ✅ | |
| 구매자 코드 입력 → 채팅 플로우 | ✅ | |
| QR 스캔 → `/order/[code]` 자동 코드 입력 (UX-2) | ✅ | |
| PortOne 결제 연동 + 서버 검증 | ✅ | |
| 동시 주문 레이스 컨디션 방지 (B-02) | ✅ | 원자적 UPDATE |
| 결제 우회 엔드포인트 제거 (B-15) | ✅ | `/api/orders` 삭제 |
| 주문 조회 (비회원, 전화번호+주문번호) | ✅ | |
| 배송지 입력 + 개인정보 동의 체크박스 | ✅ | |
| 셀러 주문 관리 + CSV 다운로드 | ✅ | UTF-8 BOM |
| 운송장 등록 UI (Dialog) | ✅ | PAID→SHIPPING |
| OrderStatus DELIVERED / REFUNDED | ✅ | 마이그레이션 완료 |
| 셀러 대시보드 (통계 카드 + 최근 주문 실데이터) | ✅ | B-22 완료 |
| 셀러 대시보드 승인 확인 버튼 (B-18) | ✅ | 승인 시 자동 로그아웃 + 재로그인 안내 |
| 셀러 정산 페이지 (목록 + 필터 + 합계) | ✅ | |
| **정산 상세 드릴다운 (Task 19 / B-06)** | ✅ | SettlementDetailDrawer + `/api/seller/settlements/[id]` |
| 관리자 셀러 승인/거부/정지 + 감사 로그 | ✅ | |
| 관리자 정산 조회 + 배치 버튼 | ✅ | B-16 인증 수정, B-20 alert() 제거 |
| 관리자 주문 목록 + 환불 UI (P2-1) | ✅ | RefundDialog + `/api/admin/orders` |
| 정산 크론 (D+3, CRON_SECRET 인증, settlementId 연결) | ✅ | |
| 서버측 전화번호 검증 (B-19) | ✅ | 회원가입 + 결제 확인 API |
| debug 엔드포인트 제거 (B-15 연관) | ✅ | |
| 채팅 오류 재시도 버튼 (B-08) | ✅ | |
| 주문 완료 후 새 코드 입력 버튼 (B-09) | ✅ | |
| 코드 검증 N+1 쿼리 최적화 (B-05) | ✅ | |

### 배포 전 잔여 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| UX-3: 코드 발급 드롭다운 상품명 표시 수정 | ⏳ 미착수 | 30분 이내 (Task 20) |
| 수동 QA 6개 항목 통과 | 🔄 진행 중 | Task 12 ← **최우선** |
| Vercel 환경변수 7개 확인 + 배포 | ⏳ QA 완료 후 | Task 14 |

---

## 2. 배포 직전 체크리스트

### 2.1 UX-3: 코드 발급 드롭다운 수정 (Task 20)

**파일:** `app/seller/codes/new/page.tsx` (약 130행)

**문제:** shadcn `Select`에서 선택된 상품이 UUID로 표시될 수 있음

**확인 방법:**
- `SelectItem value={p.id}` — value는 UUID (API 전송용), children은 `{p.name} (₩{p.price})` 형식인지 확인
- shadcn Select는 `SelectItem`의 `children` 텍스트를 `SelectTrigger` 내 `SelectValue`에 자동 표시
- 만약 UUID가 보인다면 `SelectValue` 내부에 선택된 상품 이름을 명시적으로 렌더링하도록 수정

```typescript
// 수정 전 (문제 있는 경우)
<SelectValue placeholder="상품을 선택하세요" />

// 수정 후 (명시적 렌더링)
<SelectValue placeholder="상품을 선택하세요">
  {selectedProductId
    ? products.find(p => p.id === selectedProductId)?.name + ' (₩' +
      products.find(p => p.id === selectedProductId)?.price.toLocaleString() + ')'
    : null
  }
</SelectValue>
```

**커밋:** `fix: 코드 발급 상품 선택 드롭다운 표시 수정 (UX-3)`

---

### 2.2 수동 QA 6개 항목 (Task 12)

| # | 항목 | 검증 방법 |
|---|------|-----------|
| QA-1 | 결제 플로우 | PortOne 테스트 결제창 → 서버 검증 → Order 생성 DB 확인 |
| QA-2 | 운송장 등록 | PAID 주문 → Dialog → 제출 → SHIPPING 상태 전환 확인 |
| QA-3 | 관리자 셀러 승인 | 신규 셀러 → 관리자 승인 → **셀러 재로그인** → PENDING 배너 사라짐 (또는 "승인 확인" 버튼 클릭 → 자동 로그아웃) |
| QA-4 | 정산 크론 | `POST /api/cron/settlements` (Bearer $CRON_SECRET) → Settlement 생성 + 주문 SETTLED 전환 |
| QA-5 | 미들웨어 인증 | 비로그인 `/seller/dashboard` 접근 → `/seller/login` 리다이렉트 |
| QA-6 | 이미지 업로드 | 5MB 초과 → 오류 메시지, 정상 이미지 → Vercel Blob URL 저장 확인 |

통과 조건: 6개 모두 ✅ → Task 14 (Vercel 배포) 진행

---

### 2.3 Vercel 환경변수 7개 (Task 14)

| 변수명 | 설명 |
|--------|------|
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 |
| `NEXTAUTH_SECRET` | JWT 서명 키 (32자 이상) |
| `PORTONE_API_KEY` | PortOne V2 API 키 |
| `PORTONE_STORE_ID` | PortOne 상점 ID |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 토큰 |
| `CRON_SECRET` | 정산 크론 Bearer 토큰 |
| `NEXTAUTH_URL` | 프로덕션 URL (예: `https://liveorder.vercel.app`) |

배포 후: 프로덕션 URL에서 QA-1~6 재검증

---

## 3. Phase 2 완료 현황

| 항목 | 상태 | 커밋 |
|------|------|------|
| 관리자 주문 목록 + 환불 UI (P2-1) | ✅ 완료 | 048ac72 |
| 셀러 대시보드 최근 주문 실데이터 (B-22) | ✅ 완료 | 49a984b |
| 셀러 승인 세션 갱신 UX (B-18) | ✅ 완료 | 49a984b |
| 정산 상세 드릴다운 (P2-3, B-06) | ✅ 완료 | (uncommitted) |

---

## 4. Phase 3 로드맵 (MVP 배포 이후)

우선순위 순서로 정렬. 각 항목은 독립적으로 구현 가능.

### P3-1: API 페이지네이션 (B-21)

**대상 API:** `/api/seller/orders`, `/api/seller/products`, `/api/seller/codes`, `/api/admin/orders`

**스펙:**
```typescript
// 요청: GET /api/seller/orders?page=1&limit=20
// 응답:
{
  data: [...],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}
```

**프론트엔드:** 각 목록 페이지에 페이지네이션 컴포넌트 추가
- `components/ui/Pagination.tsx` 신규 (Prev/Next + 페이지 번호)
- 또는 shadcn `Pagination` 컴포넌트 사용

---

### P3-2: 이메일 알림 (B-11)

**발송 시점:**
1. 셀러 회원가입 → 관리자에게 "신규 셀러 승인 요청" 이메일
2. 관리자 셀러 승인 → 셀러에게 "승인 완료" 이메일
3. 구매자 결제 완료 → 셀러에게 "새 주문 접수" 이메일
4. 정산 완료 → 셀러에게 "정산 완료" 이메일

**구현:**
- Resend 또는 Nodemailer + SMTP 사용
- `lib/email.ts` — `sendEmail(to, subject, html)` 유틸 함수
- 각 API 엔드포인트에서 DB 작업 완료 후 비동기 이메일 발송 (`await sendEmail(...)` — 실패해도 주문은 성공으로 처리)

**환경변수 추가:** `RESEND_API_KEY` 또는 `SMTP_HOST/USER/PASS`

---

### P3-3: 셀러 대시보드 차트 (B-13)

**파일:** `app/seller/dashboard/page.tsx`

**추가 차트:**
- 최근 7일 일별 매출 추이 (라인 차트)
- 상품별 주문 비율 (파이 차트)

**라이브러리:** `recharts` (Next.js 친화적, Tailwind 스타일 적용 가능)

**API 수정:** `app/api/seller/dashboard/route.ts`
```typescript
// 기존 응답에 추가
dailySales: await prisma.$queryRaw`
  SELECT DATE(created_at) as date, SUM(amount) as total
  FROM orders o
  JOIN codes c ON o.code_id = c.id
  JOIN products p ON c.product_id = p.id
  WHERE p.seller_id = ${sellerId}
    AND o.status != 'REFUNDED'
    AND o.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE(created_at)
  ORDER BY date ASC
`
```

---

### P3-4: 배송 추적 (B-12)

**현재:** 수동 운송장번호 + 택배사 입력만 가능

**개선 방안:**
- 스윗트래커 API 또는 배송조회 서비스 연동
- `app/api/seller/orders/[id]/tracking/route.ts` — GET 배송 현황 조회
- 셀러 주문 상세에 배송 상태 타임라인 표시
- 구매자 주문 조회 페이지에 추적 링크 제공

**Note:** MVP 이후 필요성 확인 후 구현 결정

---

### P3-5: 셀러 이메일 인증 (기획서 명시)

**현재:** 이메일 + 비밀번호 회원가입 후 즉시 PENDING 상태

**개선:**
- 회원가입 시 이메일 인증 토큰 발송
- `prisma/schema.prisma` — `Seller.emailVerified: Boolean @default(false)` 추가
- 미인증 셀러: 로그인 후 "이메일 인증 필요" 화면
- 인증 완료 후 관리자 승인 대기 상태(PENDING) 진입

---

### P3-6: 구매자 데이터 삭제권 (개인정보법)

**현재:** 구매자는 비회원으로 주문만 가능, 삭제 요청 수단 없음

**최소 구현:**
- `app/(buyer)/privacy/request/page.tsx` — 이름 + 전화번호 입력 → 주문 데이터 조회 확인
- `app/api/buyer/data-deletion/route.ts` — 해당 전화번호 주문 soft delete (status → DELETED)
- 개인정보처리방침 페이지에 삭제 요청 링크 추가

---

## 5. 기술 부채 잔여 목록

| 항목 | 우선순위 | 상태 |
|------|----------|------|
| API 전체 페이지네이션 없음 (B-21) | MED | P3-1로 계획됨 |
| 이메일 알림 없음 (B-11) | MED | P3-2로 계획됨 |
| 셀러 대시보드 차트 없음 (B-13) | LOW | P3-3으로 계획됨 |
| 배송 추적 API 없음 (B-12) | LOW | P3-4로 계획됨 |
| 셀러 이메일 인증 없음 | LOW | P3-5로 계획됨 |
| 구매자 데이터 삭제권 없음 (GDPR) | MED | P3-6으로 계획됨 |
| CSV 주문 내보내기 대용량 처리 (B-14) | LOW | 스트리밍 or 분할 다운로드 검토 |
| buyer-store 타입 안전성 개선 | LOW | `Record<string, unknown>` → 명시적 타입 |
| Redis 캐싱 (B-10) | LOW | MVP 이후 트래픽 확인 후 결정 |
