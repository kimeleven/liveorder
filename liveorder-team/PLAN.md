# LIVEORDER 개발 계획서

> 최종 업데이트: 2026-04-02 (PM 조율)
> 현재 단계: **Phase 1 MVP — 마무리 (P2 이미지 + 배포 준비)**

---

## 1. 현재 상태 평가

### 구현 완료된 기능 (Phase 1 MVP)

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로젝트 인프라 | ✅ 완료 | Next.js 16 + Prisma + Neon + Vercel |
| DB 스키마 | ✅ 완료 | Admin, Seller, Product, Code, Order, Settlement, AuditLog |
| 셀러 회원가입 | ✅ 완료 | `app/seller/auth/register/page.tsx` |
| 셀러 로그인 | ✅ 완료 | NextAuth v5 Credentials (seller-login) |
| 관리자 로그인 | ✅ 완료 | NextAuth v5 Credentials (admin-login) |
| 미들웨어 인증 | ✅ 완료 | HKDF 키 파생 JWE 토큰 복호화 |
| 상품 등록/목록 | ✅ 완료 | `app/seller/products/` + API |
| 코드 발급/관리 | ✅ 완료 | `app/seller/codes/` + API, 토글 기능 |
| 구매자 코드 입력 | ✅ 완료 | `app/(buyer)/page.tsx` 랜딩 |
| 구매자 채팅 플로우 | ✅ 완료 | Zustand 스토어 + 카드 컴포넌트 |
| PortOne 결제 연동 | ✅ 완료 | 결제창 호출 + 서버 검증 |
| 주문 생성 | ✅ 완료 | 트랜잭션 (주문 생성 + 코드 수량 업데이트) |
| 주문 조회 (비회원) | ✅ 완료 | 전화번호 + 주문번호로 조회 |
| 셀러 주문 관리 | ✅ 완료 | 주문 목록 + CSV 다운로드 |
| 셀러 대시보드 | ✅ 완료 | 통계 (상품, 코드, 주문, 정산) |
| 관리자 셀러 관리 | ✅ 완료 | 승인/거부/정지 + 감사 로그 |
| 관리자 정산 조회 | ✅ 완료 | 정산 내역 목록 |
| 정산 크론 | ✅ 완료 | `app/api/cron/settlements/route.ts` (D+3) |
| 이용약관/개인정보 | ✅ 완료 | `app/(buyer)/terms/` |
| 법적 중개자 고지 | ✅ 완료 | PaymentSummary 컴포넌트에 고지문 포함 |

### 발견된 이슈 및 미완성 항목

| # | 이슈 | 심각도 | 상태 |
|---|------|--------|------|
| 1 | 운송장 등록 UI | ~~HIGH~~ | ✅ **해결** (afc5b54) |
| 2 | 셀러 PENDING 상태 차단 | ~~HIGH~~ | ✅ **해결** (afc5b54) |
| 3 | 상품 이미지 업로드 | **MEDIUM** | 🔄 Task 9 진행 예정 (Vercel Blob) |
| 4 | 개인정보 제3자 제공 동의 | ~~HIGH~~ | ✅ **해결** (기존 구현 확인) |
| 5 | 셀러 정산 조회 상세 | **LOW** | 📋 P2 이후 |
| 6 | 주문 상태 DELIVERED | ~~MEDIUM~~ | ✅ **해결** (마이그레이션 완료, 미커밋) |
| 7 | 상품 수정/삭제 | ~~MEDIUM~~ | ✅ **해결** (API + UI 구현, 미커밋) |
| 8 | 코드 발급 API 인증 | ~~HIGH~~ | ✅ **해결** (afc5b54) |
| 9 | 셀러 정산 페이지 | ~~MEDIUM~~ | ✅ **확인** (기존 구현됨) |
| 10 | 환불 처리 | **LOW** | 📋 MVP 이후 |
| 11 | debug 엔드포인트 노출 | **HIGH** | 🔄 Task 8 — 배포 전 삭제 필수 |

---

## 2. 즉시 해결 필요 사항 (Critical Fixes)

### 2.1 운송장 등록 UI 추가
**파일:** `app/seller/orders/page.tsx`
**요구사항:**
- 각 주문 행에 "운송장 등록" 버튼 추가 (status가 PAID 또는 SHIPPING일 때만)
- 클릭 시 Dialog 열림: 택배사 선택 (CJ대한통운, 로젠택배, 한진택배, 롯데택배, 우체국) + 운송장번호 입력
- 제출 시 `POST /api/seller/orders/[id]/tracking` 호출
- 성공 후 목록 갱신, 상태를 SHIPPING으로 변경

**Dialog 컴포넌트 스펙:**
```tsx
// 택배사 목록
const carriers = [
  { value: "CJ대한통운", label: "CJ대한통운" },
  { value: "로젠택배", label: "로젠택배" },
  { value: "한진택배", label: "한진택배" },
  { value: "롯데택배", label: "롯데택배" },
  { value: "우체국택배", label: "우체국택배" },
];
```

### 2.2 셀러 PENDING 상태 차단
**파일들:**
- `app/api/seller/products/route.ts` — POST에서 셀러 status가 APPROVED인지 확인
- `app/api/codes/route.ts` — POST를 `/api/seller/codes/route.ts`로 이동하거나, 셀러 인증 추가
- `app/seller/dashboard/page.tsx` — PENDING 상태 안내 배너 추가

**구현:**
```typescript
// 셀러 API에서 공통으로 확인
const seller = await prisma.seller.findUnique({ where: { id: session.user.id } });
if (seller?.status !== 'APPROVED') {
  return NextResponse.json({ error: '승인된 셀러만 이용 가능합니다.' }, { status: 403 });
}
```

### 2.3 코드 발급 API 인증 수정
**현재:** `app/api/codes/route.ts` — POST가 public (인증 없음)
**수정:** 미들웨어에서 `/api/seller/*`만 보호하므로, 코드 발급 POST를 `app/api/seller/codes/route.ts`로 이동
- 기존 `app/api/seller/codes/route.ts`의 GET에 POST 핸들러 추가
- `app/api/codes/route.ts`의 POST 제거 (GET은 구매자가 코드 조회할 때 사용하므로 유지)
- `app/seller/codes/new/page.tsx`에서 fetch URL을 `/api/seller/codes`로 변경

### 2.4 개인정보 제3자 제공 동의 추가
**파일:** `components/buyer/cards/AddressForm.tsx`
**요구사항:**
- 배송지 입력 폼 하단에 체크박스 추가
- 문구: "배송 처리를 위해 수령인명, 배송주소, 연락처를 판매자에게 제공하는 것에 동의합니다."
- 체크하지 않으면 다음 단계 진행 불가

---

## 3. 다음 작업 (우선순위 순)

### Phase 1 마무리 작업

#### P0 — 완료 ✅

1. ~~**운송장 등록 UI**~~ ✅ afc5b54
2. ~~**셀러 PENDING 차단**~~ ✅ afc5b54
3. ~~**코드 발급 API 보안**~~ ✅ afc5b54
4. ~~**개인정보 동의**~~ ✅ 기존 구현 확인

#### P1 — 완료 ✅ (미커밋 — 다음 커밋 필요)

5. ~~**OrderStatus DELIVERED 추가**~~ ✅ 마이그레이션 완료
6. ~~**상품 수정/삭제**~~ ✅ API + UI 구현
7. ~~**셀러 정산 페이지**~~ ✅ 기존 구현 확인

#### 배포 전 필수 (Task 8)

- **debug 엔드포인트 제거** (`app/api/debug/route.ts`) — 보안

#### P2 — 현재 진행 (Task 9)

8. **상품 이미지 업로드** (이슈 #3)
   - Option A: Vercel Blob Storage (간단)
   - Option B: AWS S3 (기획서 권장)
   - 상품 등록/수정 폼에 이미지 업로드 추가
   - 구매자 ProductCard에 이미지 표시

9. **E2E 테스트 시나리오**
   - Playwright로 핵심 플로우 테스트
   - 셀러 등록 → 로그인 → 상품 등록 → 코드 발급
   - 구매자 코드 입력 → 결제 → 주문 완료
   - 관리자 셀러 승인

10. **에러 처리 개선**
    - API 응답 표준화 (일관된 에러 형식)
    - 구매자 채팅에서 네트워크 오류 시 재시도 버튼

---

## 4. UI/UX 개선 사항

### 4.1 셀러 대시보드 개선
- 최근 주문 5건 빠른 보기 (대시보드에)
- 코드별 주문 수 차트 (간단한 바 차트)
- 정산 예정 금액 표시

### 4.2 구매자 채팅 UX 개선
- 채팅 메시지 스크롤 자동 하단 이동
- 결제 완료 후 "새 코드 입력하기" 버튼
- 주문 완료 시 주문번호 복사 버튼

### 4.3 모바일 최적화
- 구매자 페이지 100% 모바일 최적화 (주 타겟)
- 셀러 대시보드 반응형 테이블 → 카드 뷰 (모바일)

---

## 5. 기술 부채

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| `package-lock.json` 변경 | git status에 변경사항 있음 — 의존성 정리 필요 | LOW |
| Redis 미사용 | 기획서에는 Redis 캐싱이 있으나 현재 미구현. Neon만 사용 | LOW (MVP 이후) |
| debug 엔드포인트 제거 | `app/api/debug/route.ts` — 프로덕션 전 제거 필요 | MEDIUM |
| 타입 안전성 | buyer-store에 `Record<string, unknown>` 과다 사용 — 구체적 타입 정의 필요 | LOW |
| 환경변수 | `.env.example` 업데이트 필요 (PortOne 관련 변수 추가) | LOW |

---

## 6. Phase 2 로드맵 (MVP 완료 후)

- 자동 정산 배치 (Vercel Cron Jobs 활용)
- 택배사 API 연동 (배송 추적)
- 셀러 매출 분석 대시보드
- 환불/취소 처리 워크플로우
- 상품 이미지 다중 업로드
- 카테고리별 금지 상품 필터
- 이메일 알림 (주문 접수, 정산 완료)
