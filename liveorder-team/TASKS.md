# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-03 (PM 조율 — Task 21/22 구현 완료 확인, Task 23 이메일 알림 배정)

---

## 🔴 Dev1 현재 할당 — **Step 1: 미커밋 변경사항 커밋 → Step 2: Task 23 이메일 알림**

> **Task 21 (P3-0 기술 부채 클린업):** 구현 완료 ✅ — 미커밋 상태
> **Task 22 (P3-1 API 페이지네이션):** 구현 완료 ✅ — 미커밋 상태
> **즉시 할 일:** 아래 2개 커밋 후 Task 23 시작

---

### ⚡ 즉시: 미커밋 변경사항 커밋

현재 워킹 트리에 완성된 변경사항이 있음. 2개 커밋으로 분리:

```bash
# Task 21 커밋
git add components/seller/SettlementDetailDrawer.tsx \
        components/admin/RefundDialog.tsx \
        stores/buyer-store.ts \
        components/ui/skeleton.tsx
git commit -m "fix: 기술 부채 클린업 — SettlementDrawer 에러 처리, RefundDialog 상태, buyer-store 타입"

# Task 22 커밋
git add lib/pagination.ts \
        components/ui/Pagination.tsx \
        app/api/seller/orders/route.ts \
        app/api/seller/products/route.ts \
        app/api/seller/codes/route.ts \
        app/admin/orders/page.tsx \
        app/seller/orders/page.tsx \
        app/seller/products/page.tsx \
        app/seller/codes/page.tsx
git commit -m "feat: API 페이지네이션 구현 (P3-1) — 셀러/관리자 목록 4개 + Pagination 컴포넌트"
```

---

### Task 23: P3-2 이메일 알림 ← **커밋 후 바로 여기**

**우선순위:** MED — P3-1 완료 후

**패키지 설치:** `npm i resend`

**환경변수 추가:**
- `RESEND_API_KEY` — `.env.example`에도 추가

**신규 파일 `lib/email.ts`**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // 환경변수 없으면 무시
  try {
    await resend.emails.send({
      from: 'LiveOrder <noreply@liveorder.app>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[email] send failed:', error);
    // 이메일 실패는 비즈니스 로직에 영향 없음
  }
}
```

**API 수정 4곳:**

1. `app/api/sellers/register/route.ts` — 가입 완료 후 관리자에게 알림
2. `app/api/admin/sellers/[id]/route.ts` (또는 승인 API) — 승인 시 셀러에게 알림
3. `app/api/payments/confirm/route.ts` — 주문 생성 성공 후 셀러에게 알림
4. `app/api/cron/settlements/route.ts` — 정산 생성 완료 후 셀러에게 알림

**커밋:** `feat: 이메일 알림 구현 (P3-2) — Resend 연동, 회원가입/승인/주문/정산 4개 알림`

---

## 📋 다음 작업 — Phase 3 (순서대로)

### Task 24: P3-3 셀러 대시보드 차트

**우선순위:** LOW — P3-2 완료 후

**패키지 설치:** `npm i recharts`

**파일 수정 2개:**
- `app/api/seller/dashboard/route.ts` — dailySales 데이터 추가 (PLAN.md 3절 SQL 참고)
- `app/seller/dashboard/page.tsx` — LineChart 컴포넌트 추가 (PLAN.md 3절 UI 참고)

**커밋:** `feat: 셀러 대시보드 7일 매출 차트 추가 (P3-3)`

---

### Task 25: P3-4 배송 추적

**우선순위:** LOW — P3-3 완료 후

**신규 파일 `lib/carrier-urls.ts`** (PLAN.md 3절 참고)

**수정 파일:** 구매자 주문 조회 페이지에 "배송 추적" 버튼 추가 (택배사 홈페이지 새 탭)

**커밋:** `feat: 배송 추적 링크 추가 (P3-4) — 택배사별 URL 매핑`

---

### Task 26: P3-5 셀러 이메일 인증

**우선순위:** LOW — P3-4 완료 후 (P3-2 의존)

**DB 변경 필요:**
```prisma
// prisma/schema.prisma Seller 모델에 추가
emailVerified      Boolean  @default(false) @map("email_verified")
emailVerifyToken   String?  @map("email_verify_token") @db.VarChar(100)
```

**마이그레이션:** `npx prisma migrate dev --name add-email-verification`

**플로우:** (PLAN.md P3-5 절 참고)

**커밋:** `feat: 셀러 이메일 인증 구현 (P3-5)`

---

### Task 27: P3-6 구매자 데이터 삭제권

**우선순위:** MED — P3-5 완료 후

**신규 파일 2개:**
- `app/(buyer)/privacy/request/page.tsx`
- `app/api/buyer/data-deletion/route.ts`

**커밋:** `feat: 구매자 개인정보 삭제 요청 API + 페이지 (P3-6)`

---

## ✅ 완료된 작업

| 완료일 | 작업 | 커밋 |
|--------|------|------|
| 2026-04-03 | Task 22: P3-1 API 페이지네이션 — `lib/pagination.ts`, `components/ui/Pagination.tsx`, API 4개, 프론트 4개 | 미커밋 |
| 2026-04-03 | Task 21: P3-0 기술 부채 클린업 — SettlementDrawer 에러 처리, admin 로딩 Skeleton, RefundDialog 상태, buyer-store 타입 | 미커밋 |
| 2026-04-03 | Task 12: QA 6개 항목 코드 레벨 검증 완료 — 결제/운송장/승인/크론/미들웨어/이미지 업로드 | 1a4164d |
| 2026-04-03 | B-23: QR 코드 구현 — qrcode 패키지, 발급 성공 화면 QR 표시 + `/order/[code]` 라우트 | 882fe02 |
| 2026-04-03 | B-24: PLAN.md에 `PORTONE_API_SECRET` 환경변수 추가 | 882fe02 |
| 2026-04-03 | B-25: 정산 테이블 `colSpan={8}` 수정 | 882fe02 |
| 2026-04-03 | B-26: `/api/seller/products` GET에 `isActive: true` 필터 추가 | 882fe02 |
| 2026-04-03 | Task 20: UX-3 확인 — shadcn SelectItem 자동 처리, 수정 불필요 | - |
| 2026-04-03 | Task 19: 정산 상세 드릴다운 (P2-3, B-06) — SettlementDetailDrawer + `/api/seller/settlements/[id]` | 80478e4 |
| 2026-04-03 | UX-1: 상품 등록 시 코드 자동 발급 — autoCode 응답 + 코드 표시 UI | 80478e4 |
| 2026-04-03 | UX-2: 코드 발급 시 QR코드 자동 생성 — QR 스캔으로 코드 입력 자동화 | c0bb241 |
| 2026-04-03 | Task 16: 관리자 주문 목록 + 환불 UI (P2-1) | 048ac72 |
| 2026-04-03 | Task 17: 셀러 대시보드 최근 주문 실데이터 표시 (B-22) | 49a984b |
| 2026-04-03 | Task 18: JWT 세션 갱신 UX 개선 — "승인 확인" 버튼 (B-18) | 49a984b |
| 2026-04-03 | Task 15: B-19 서버측 전화번호 검증 + B-20 정산 배치 alert() 제거 | 6bcb637 |
| 2026-04-02 | B-15 결제 우회 엔드포인트 삭제, B-16 관리자 배치 인증 수정, B-17 비활성 상품 코드 발급 차단 | ac653d0 |
| 2026-04-02 | 미들웨어 HKDF salt 버그 수정 | 876bb02 |
| 2026-04-02 | 관리자 계정 DB seed 수정 | cc08f64 |
| 2026-04-02 | B-05 N+1 쿼리 최적화, B-08 재시도 버튼, B-09 새 코드 입력 버튼, .env.example | d77750f |
| 2026-04-02 | B-03 카테고리 미선택 UX, B-04 연락처 형식 검증 (프론트) | b5c9043 |
| 2026-04-02 | B-01 크론 인증, B-02 레이스컨디션 수정 | 1485f74 |
| 2026-04-02 | debug 엔드포인트 제거, 상품 이미지 업로드 (Vercel Blob) | af0cc28 |
| 2026-04-02 | DELIVERED 상태, 상품 수정/삭제, 정산 필터 | cad9243 |
| 2026-04-02 | 운송장 UI, 코드 API 보안, PENDING 차단, 개인정보 동의 | afc5b54 |
| 2026-04-01 | 미들웨어 JWE 복호화, auth() 레이아웃 루프 수정 | 2c30a67 |
| 2026-04-01 | Neon HTTP 어댑터, Prisma 빌드 스크립트 | 3732637 |
| 초기 | 셀러/관리자 인증, 상품/코드/주문/정산 전체 플로우 | - |

---

## 📌 수동 진행 항목 (개발 작업 아님)

### Task 14: Vercel 환경변수 확인 + 배포 ← **진행 중 (수동)**

**상태:** Phase 3 작업과 병행 가능

**작업 내용:**
1. Vercel 프로젝트 Settings → Environment Variables에서 8개 변수 확인:
   - `DATABASE_URL`, `NEXTAUTH_SECRET`, `PORTONE_API_KEY`, `PORTONE_STORE_ID`
   - `PORTONE_API_SECRET` (⚠️ 환불 필수), `BLOB_READ_WRITE_TOKEN`
   - `CRON_SECRET`, `NEXTAUTH_URL`

2. 미설정 항목 추가 후 Redeploy

3. 프로덕션 스모크 테스트 (PLAN.md 2.2절 참고)
