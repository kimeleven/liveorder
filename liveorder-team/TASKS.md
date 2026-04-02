# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-02

---

## Dev1 현재 작업 — P2: debug 정리 + 이미지 업로드

### Task 8: debug 엔드포인트 제거 (보안)
**우선순위:** P1-HIGH (배포 전 필수)
**파일:**
- `app/api/debug/route.ts` — 파일 전체 삭제

**배경:** DB 연결 테스트용 public 엔드포인트. 프로덕션에서 DB 스키마 정보 노출 위험. 배포 전 반드시 제거.

**구현:**
1. `app/api/debug/route.ts` 삭제
2. 해당 경로를 참조하는 파일 없는지 확인 후 커밋

---

### Task 9: 상품 이미지 업로드 (Vercel Blob)
**우선순위:** P2
**파일:**
- `app/api/seller/products/upload/route.ts` — 신규 (Vercel Blob 업로드)
- `app/seller/products/new/page.tsx` — 이미지 파일 선택 UI
- `app/seller/products/[id]/edit/page.tsx` — 수정 시 이미지 교체
- `components/buyer/cards/ProductCard.tsx` — imageUrl 있으면 표시

**구현 상세:**
1. `npm install @vercel/blob`
2. 업로드 API (`app/api/seller/products/upload/route.ts`):
```typescript
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return new Response("파일 없음", { status: 400 });
  const blob = await put(`products/${session.user.id}/${Date.now()}-${file.name}`, file, { access: "public" });
  return Response.json({ url: blob.url });
}
```
3. 상품 등록/수정 폼에 `<input type="file" accept="image/*">` 추가, 선택 시 업로드 → `imageUrl` 저장
4. ProductCard: `imageUrl` 있으면 `<Image>` 표시, 없으면 회색 placeholder

**환경변수 필요:** `BLOB_READ_WRITE_TOKEN` (Vercel Blob Storage 연동 후 발급)

---

## 완료된 P0 작업 ✅ (커밋: afc5b54, 2026-04-02)

### Task 1: 운송장 등록 UI ✅
`app/seller/orders/page.tsx` — Dialog (택배사 + 운송장번호), PAID/SHIPPING 상태 전용 버튼

### Task 2: 코드 발급 API 보안 ✅
POST `/api/codes` → `/api/seller/codes` 이동. 프론트엔드 URL 수정.

### Task 3: 셀러 PENDING 상태 차단 ✅
상품 등록/코드 발급 API에 APPROVED 검증. 대시보드 PENDING 배너.

### Task 4: 개인정보 제3자 제공 동의 ✅
`AddressForm.tsx` — 수집·이용 + 제3자 제공 동의 체크박스 (미체크 시 제출 불가).

---

## 완료된 P1 작업 ✅ (미커밋 — Task 8과 함께 커밋 예정)

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

## 완료된 인프라 작업

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
