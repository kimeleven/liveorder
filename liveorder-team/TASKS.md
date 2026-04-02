# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-02 (Planner)

---

## Dev1 현재 작업 — 배포 전 마지막 2건

### Task 8: debug 엔드포인트 제거 (보안) ← 먼저 처리
**우선순위:** P1-CRITICAL (배포 전 필수)

**배경:** `app/api/debug/route.ts`는 DB 연결 테스트용 public 엔드포인트. 프로덕션에서 DB 내부 정보 노출 위험.

**구현 (1분 작업):**
1. `app/api/debug/route.ts` 파일 삭제
2. `grep -r "/api/debug" app/` — 참조 없는지 확인
3. 커밋: `fix: remove debug endpoint for production security`

---

### Task 9: 상품 이미지 업로드 (Vercel Blob)
**우선순위:** P2

**사전 준비:**
```bash
npm install @vercel/blob
```
`.env.local`에 추가:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```
(Vercel 대시보드 → Storage → Blob → 연결 → 토큰 복사)

**구현 순서:**

#### Step 1: 업로드 API 생성
파일: `app/api/seller/products/upload/route.ts` (신규)

```typescript
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return new Response("파일 없음", { status: 400 });

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

#### Step 2: 상품 등록 폼 수정
파일: `app/seller/products/new/page.tsx`

추가할 state (기존 `const [category, setCategory] = useState("")` 아래):
```typescript
const [imageUrl, setImageUrl] = useState<string>("");
const [imageUploading, setImageUploading] = useState(false);
```

이미지 업로드 핸들러 (handleSubmit 위에 추가):
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
    setError("이미지 업로드에 실패했습니다.");
  }
  setImageUploading(false);
}
```

폼 내부 카테고리 Select 아래에 삽입:
```tsx
<div className="space-y-2">
  <Label>상품 이미지 (선택)</Label>
  <Input
    type="file"
    accept="image/*"
    onChange={handleImageUpload}
    disabled={imageUploading}
  />
  {imageUploading && (
    <p className="text-sm text-muted-foreground">업로드 중...</p>
  )}
  {imageUrl && (
    <img
      src={imageUrl}
      alt="상품 미리보기"
      className="w-32 h-32 object-cover rounded border"
    />
  )}
</div>
```

handleSubmit의 body에 `imageUrl` 추가:
```typescript
body: JSON.stringify({
  name: formData.get("name"),
  description: formData.get("description"),
  price: formData.get("price"),
  stock: formData.get("stock"),
  category,
  imageUrl: imageUrl || undefined,
}),
```

#### Step 3: 상품 수정 폼 수정
파일: `app/seller/products/[id]/edit/page.tsx`

- Step 2와 동일한 state와 핸들러 추가
- `useEffect`에서 product 로드 후 `setImageUrl(data.imageUrl ?? "")` 추가
- PUT body에 `imageUrl: imageUrl || undefined` 추가

#### Step 4: ProductCard 이미지 표시
파일: `components/buyer/cards/ProductCard.tsx`

`import Image from "next/image"` 추가 후, `<h3>` 앞에 삽입:
```tsx
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

**next.config.js에 Vercel Blob 도메인 허용 추가 필요:**
```javascript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
    },
  ],
},
```

**커밋:** `feat: add product image upload with Vercel Blob`

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
