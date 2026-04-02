# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-03 (PM 조율 — B-23/24/25/26 완료 확인, Task 12 수동 QA 진행 중)

---

## 🔴 Dev1 현재 할당 — **Task 12: 수동 QA 6개 항목 통과 (배포 최종 블로커)**

> **지금 당장 해야 할 일:** 아래 Task 12의 QA 항목 6개를 로컬 또는 스테이징에서 직접 실행하여 검증.
> 6개 모두 ✅ → QA_REPORT.md 업데이트 → Task 14 (Vercel 배포) 진행.

### ~~Task 20: UX-3 코드 발급 드롭다운 상품명 표시 수정~~ ← **✅ 확인 완료 (shadcn 자동 처리)**

**파일:** `app/seller/codes/new/page.tsx` (~130행)

**확인:** 코드 발급 페이지에서 상품 선택 후 SelectTrigger에 상품명이 표시되는지 확인
- 정상이면 그대로 둠 (shadcn Select가 자동 처리)
- UUID가 보이면 아래처럼 수정:

```typescript
// products state와 selectedProductId state가 있다고 가정
<SelectValue placeholder="상품을 선택하세요">
  {selectedProductId
    ? (() => {
        const p = products.find(p => p.id === selectedProductId);
        return p ? `${p.name} (₩${p.price.toLocaleString()})` : null;
      })()
    : null}
</SelectValue>
```

**커밋:** `fix: 코드 발급 상품 선택 드롭다운 표시 수정 (UX-3)`

---

### Task 12: 수동 QA 6개 항목 통과 ← **Task 20 후 바로**

QA_REPORT.md "검증 필요 항목" 6개를 로컬 또는 스테이징에서 직접 확인.
각 항목 통과 시 QA_REPORT.md 해당 항목 옆에 ✅ 표기 + 날짜 기재.

**QA 항목:**
1. 결제 플로우: PortOne 테스트 결제창 → 서버 검증 → 주문 DB 생성 확인
2. 운송장 등록: PAID 주문 → Dialog → 제출 → SHIPPING 전환
3. 관리자 승인: 신규 셀러 → 관리자 승인 → **셀러 "승인 확인" 버튼 클릭** → 자동 로그아웃 후 재로그인 → PENDING 배너 사라짐
4. 정산 크론: `Authorization: Bearer $CRON_SECRET` 헤더로 POST → Settlement 생성 + 주문 SETTLED + settlementId 연결
5. 미들웨어: 비로그인 상태 `/seller/dashboard` 접근 → `/seller/login` 리다이렉트
6. 이미지 업로드: 5MB 초과 → 오류 메시지, 정상 이미지 → Vercel Blob URL 저장

**완료 조건:** QA_REPORT.md 6개 항목 모두 ✅ → Task 14 (Vercel 배포) 진행
**커밋:** `qa: Phase 1 수동 QA 6개 항목 통과 확인`

---

### Task 14: Vercel 환경변수 확인 + 배포 (Task 12 완료 후)

1. Vercel 프로젝트 Settings → Environment Variables에서 7개 변수 설정 확인:
   - `DATABASE_URL`, `NEXTAUTH_SECRET`, `PORTONE_API_KEY`, `PORTONE_STORE_ID`
   - `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `NEXTAUTH_URL`
2. 미설정 항목 추가 후 Redeploy
3. 프로덕션 URL에서 QA 항목 1~6 재검증
4. **커밋:** `chore: 프로덕션 배포 확인 및 환경변수 체크 완료`

---

## ✅ 완료된 작업

| 완료일 | 작업 | 커밋 |
|--------|------|------|
| 2026-04-03 | B-23: QR 코드 구현 — `qrcode` 패키지 설치, 발급 성공 화면 QR 표시 + 다운로드, `/order/[code]` 라우트 | (current) |
| 2026-04-03 | B-24: PLAN.md에 `PORTONE_API_SECRET` 환경변수 추가 | (current) |
| 2026-04-03 | B-25: 정산 테이블 `colSpan={7}` → `{8}` 수정 | (current) |
| 2026-04-03 | B-26: `/api/seller/products` GET에 `isActive: true` 필터 추가 | (current) |
| 2026-04-03 | Task 20: UX-3 확인 — shadcn SelectItem 자동 처리, 수정 불필요 | - |
| 2026-04-03 | Task 19: 정산 상세 드릴다운 (P2-3, B-06) — SettlementDetailDrawer + `/api/seller/settlements/[id]` + settlementId FK | (uncommitted) |
| 2026-04-03 | UX-1: 상품 등록 시 코드 자동 발급 — `autoCode` 응답 + 코드 표시 UI | (uncommitted) |
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

## 📋 Phase 3 예정 (MVP 배포 후)

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| P3-1: API 페이지네이션 전체 (B-21) | MED | 모든 목록 API + 프론트 Pagination 컴포넌트 |
| P3-2: 이메일 알림 (B-11) | MED | Resend 연동 — 주문 접수/승인/정산 알림 |
| P3-3: 셀러 대시보드 차트 (B-13) | LOW | recharts — 7일 매출 추이 + 상품별 비율 |
| P3-4: 배송 추적 API (B-12) | LOW | 스윗트래커 or 배송조회 서비스 연동 |
| P3-5: 셀러 이메일 인증 | LOW | 기획서 명시 기능 |
| P3-6: 구매자 데이터 삭제권 (GDPR) | MED | 개인정보법 요구 |
