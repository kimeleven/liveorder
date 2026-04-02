# LIVEORDER 개발 계획서

> 최종 업데이트: 2026-04-02 (PM)
> 현재 단계: **Phase 1 MVP — 수동 QA 진행 중, 배포 직전**

---

## 1. 현재 상태 평가

### 구현 완료된 기능 (Phase 1 MVP)

| 기능 | 상태 | 커밋 |
|------|------|------|
| 프로젝트 인프라 (Next.js 16 + Prisma + Neon + Vercel) | ✅ 완료 | 초기 |
| DB 스키마 (Admin, Seller, Product, Code, Order, Settlement, AuditLog) | ✅ 완료 | 초기 |
| 셀러 회원가입 / 로그인 | ✅ 완료 | 초기 |
| 관리자 로그인 | ✅ 완료 | 초기 |
| 미들웨어 인증 (HKDF JWE 복호화) | ✅ 완료 | 2c30a67 |
| 상품 등록/목록 (`app/seller/products/`) | ✅ 완료 | 초기 |
| 상품 수정/삭제 (`app/api/seller/products/[id]`) | ✅ 완료 | cad9243 |
| 코드 발급/관리 (`app/seller/codes/`) | ✅ 완료 | 초기 |
| 코드 발급 API 보안 (`/api/seller/codes`) | ✅ 완료 | afc5b54 |
| 셀러 PENDING 차단 (상품/코드 API) | ✅ 완료 | afc5b54 |
| 구매자 코드 입력 → 채팅 플로우 | ✅ 완료 | 초기 |
| PortOne 결제 연동 + 서버 검증 | ✅ 완료 | 54b66f4 |
| 주문 생성 트랜잭션 | ✅ 완료 | 초기 |
| 주문 조회 (비회원, 전화번호+주문번호) | ✅ 완료 | 초기 |
| 배송지 입력 + 개인정보 동의 체크박스 | ✅ 완료 | afc5b54 |
| 셀러 주문 관리 + CSV 다운로드 | ✅ 완료 | 초기 |
| 운송장 등록 UI (Dialog, PAID/SHIPPING) | ✅ 완료 | afc5b54 |
| OrderStatus DELIVERED 추가 + 마이그레이션 | ✅ 완료 | cad9243 |
| 셀러 대시보드 (통계) | ✅ 완료 | 초기 |
| 셀러 정산 페이지 (목록 + 필터 + 합계) | ✅ 완료 | cad9243 |
| 관리자 셀러 승인/거부/정지 + 감사 로그 | ✅ 완료 | 초기 |
| 관리자 정산 조회 | ✅ 완료 | 초기 |
| 정산 크론 (D+3, `app/api/cron/settlements`) | ✅ 완료 | 초기 |
| 이용약관 + 개인정보처리방침 | ✅ 완료 | 초기 |
| 법적 중개자 고지문 (PaymentSummary) | ✅ 완료 | 초기 |

### 잔여 작업 (배포 전 완료 필요)

| # | 항목 | 심각도 | 상태 |
|---|------|--------|------|
| T-08 | `app/api/debug/route.ts` 삭제 | **P1-CRITICAL** (보안) | ✅ 완료 (2026-04-02) |
| T-09 | 상품 이미지 업로드 (Vercel Blob) | **P2** | ✅ 완료 (2026-04-02) |
| B-01 | 정산 크론 인증 (CRON_SECRET Bearer) | **P1** | ✅ 완료 (2026-04-02) |
| B-02 | 동시 주문 레이스 컨디션 수정 | **P1** | ✅ 완료 (2026-04-02) |

**남은 배포 전 작업:** 수동 QA 6개 항목 통과

---

## 2. Task 8 상세 스펙 — debug 엔드포인트 제거

**배경:** `app/api/debug/route.ts`는 DB 연결 테스트용 public 엔드포인트로, Neon DB 연결 정보와 내부 쿼리 결과를 외부에 노출할 위험이 있다. 프로덕션 배포 전 반드시 삭제해야 한다.

**구현:**
1. `app/api/debug/route.ts` 파일 삭제
2. `app/` 전체에서 `/api/debug` URL 참조 검색 → 없으면 완료
3. 커밋: `fix: remove debug endpoint for production security`

---

## 3. Task 9 상세 스펙 — 상품 이미지 업로드

### 3.1 배경 및 목표

- `Product` 모델에 `imageUrl String?` 필드가 있지만 현재 이미지 업로드 기능이 없음
- `ProductCard.tsx`에 이미지가 표시되지 않음
- 목표: 셀러가 상품 등록/수정 시 이미지를 업로드하고, 구매자 채팅에서 이미지가 표시되도록 구현

### 3.2 기술 선택

**Vercel Blob Storage** 사용 (MVP에 적합, 설정 간단)
- `npm install @vercel/blob`
- 환경변수: `BLOB_READ_WRITE_TOKEN` (Vercel 대시보드에서 발급 후 `.env.local` + Vercel 환경변수에 추가)

### 3.3 구현 파일 목록

| 파일 | 작업 | 상태 |
|------|------|------|
| `app/api/seller/products/upload/route.ts` | 신규 생성 (Blob 업로드 API) | ❌ |
| `app/seller/products/new/page.tsx` | 이미지 파일 선택 + 업로드 UI 추가 | ❌ |
| `app/seller/products/[id]/edit/page.tsx` | 이미지 교체 UI 추가 | ❌ |
| `components/buyer/cards/ProductCard.tsx` | imageUrl 있으면 `<Image>` 표시 | ❌ |

### 3.4 API 스펙 — `app/api/seller/products/upload/route.ts`

```typescript
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return new Response("파일 없음", { status: 400 });

  // 파일 유효성: 이미지만, 5MB 이하
  if (!file.type.startsWith("image/")) {
    return new Response("이미지 파일만 업로드 가능합니다.", { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return new Response("파일 크기는 5MB 이하여야 합니다.", { status: 400 });
  }

  const blob = await put(
    `products/${session.user.id}/${Date.now()}-${file.name}`,
    file,
    { access: "public" }
  );

  return Response.json({ url: blob.url });
}
```

### 3.5 상품 등록 폼 변경 — `app/seller/products/new/page.tsx`

**추가할 state:**
```typescript
const [imageUrl, setImageUrl] = useState<string>("");
const [imageUploading, setImageUploading] = useState(false);
```

**이미지 업로드 핸들러:**
```typescript
async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  setImageUploading(true);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/seller/products/upload", { method: "POST", body: form });
  if (res.ok) {
    const { url } = await res.json();
    setImageUrl(url);
  } else {
    setError("이미지 업로드 실패");
  }
  setImageUploading(false);
}
```

**폼에 추가 (카테고리 Select 아래에 삽입):**
```tsx
<div className="space-y-2">
  <Label>상품 이미지 (선택)</Label>
  <Input
    type="file"
    accept="image/*"
    onChange={handleImageUpload}
    disabled={imageUploading}
  />
  {imageUploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}
  {imageUrl && (
    <img src={imageUrl} alt="상품 미리보기" className="w-32 h-32 object-cover rounded border" />
  )}
</div>
```

**handleSubmit의 body에 `imageUrl` 추가:**
```typescript
body: JSON.stringify({
  name: formData.get("name"),
  description: formData.get("description"),
  price: formData.get("price"),
  stock: formData.get("stock"),
  category,
  imageUrl: imageUrl || undefined,  // 추가
}),
```

### 3.6 상품 수정 폼 변경 — `app/seller/products/[id]/edit/page.tsx`

- 기존 `product` 로드 시 `imageUrl` 포함되어 있으면 state에 세팅
- 위 3.5와 동일한 이미지 업로드 핸들러 추가
- PUT body에 `imageUrl` 포함

**초기 state 세팅 (useEffect에서):**
```typescript
setImageUrl(data.imageUrl ?? "");
```

### 3.7 ProductCard 변경 — `components/buyer/cards/ProductCard.tsx`

```tsx
import Image from "next/image";

// h3 위에 이미지 추가
{product?.imageUrl ? (
  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 mb-3">
    <Image
      src={product.imageUrl as string}
      alt={product.name as string}
      fill
      className="object-cover"
    />
  </div>
) : (
  <div className="w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
    <span className="text-gray-400 text-sm">이미지 없음</span>
  </div>
)}
```

### 3.8 환경변수

`.env.local`에 추가 필요:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Vercel 프로젝트 설정 → Storage → Blob → 연결 후 토큰 발급

---

## 4. 배포 체크리스트

Phase 1 MVP 배포 가능 기준:

- [x] 핵심 플로우 15단계 모두 ✅
- [x] **T-08: debug 엔드포인트 제거** (보안 필수) ✅
- [x] T-09: 이미지 업로드 (Vercel Blob) ✅
- [x] B-01: 정산 크론 인증 (CRON_SECRET) ✅
- [x] B-02: 레이스 컨디션 수정 (원자적 UPDATE) ✅
- [ ] **수동 QA 6개 항목 통과** (QA_REPORT.md 참조) ← 현재 진행 중
- [ ] Vercel 환경변수 확인 (DATABASE_URL, NEXTAUTH_SECRET, PORTONE_API_KEY, BLOB_READ_WRITE_TOKEN, CRON_SECRET)

---

## 5. Phase 2 로드맵 (MVP 배포 후)

| 기능 | 우선순위 |
|------|----------|
| 환불/취소 처리 (관리자 UI) | HIGH |
| 구매자 채팅 오류 재시도 버튼 | MEDIUM |
| 정산 상세 (정산별 포함 주문 내역) | MEDIUM |
| 택배사 API 연동 (배송 추적) | LOW |
| 셀러 대시보드 차트 (코드별 주문 수) | LOW |
| 이메일 알림 (주문 접수, 정산 완료) | LOW |
| Redis 캐싱 | LOW |
