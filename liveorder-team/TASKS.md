# LIVEORDER 개발 태스크

> 최종 업데이트: 2026-04-09 (Planner — 팀 재가동. Task 34 미구현 확인. Phase 4 카카오톡 챗봇 태스크 추가.)

---

## 🔧 Dev1 현재 할당 — **Task 34 → Task 35 순서로 진행**

> **완료:** Task 21~33 ✅ · B-27~B-33 ✅ · HIGH/MED QA 버그 전체 수정 ✅ · 법적 의무(청약확인/청약철회) ✅
> **배포 블로커 없음** — Task 14 (Vercel 수동 배포) 진행 가능

---

### ✅ Task 34: 사업자등록증 이미지 업로드 (셀러 회원가입 필수)

**우선순위:** MED
**상태:** ✅ 완료 (2026-04-09, 커밋 89f5fab)

**배경:** 셀러 신뢰도 검증. 기획서 3.1.1절 필수 요건.
현재: `prisma/schema.prisma`에 `bizRegImageUrl` 필드 없음. API 없음. 폼 없음.
참조: `app/api/seller/products/upload/route.ts` 패턴 재사용.

**수정 파일 6개 (순서대로):**

#### Step 1: `prisma/schema.prisma`
`tradeRegNo` 필드 아래에 추가:
```prisma
bizRegImageUrl String? @map("biz_reg_image_url")
```
마이그레이션:
```bash
npx prisma migrate dev --name add_biz_reg_image
```

#### Step 2: `app/api/seller/biz-reg-upload/route.ts` 신규 생성
`app/api/seller/products/upload/route.ts` 복사 후:
- filename: `biz-reg/${session.user.id}/${Date.now()}.${ext}`
- allowedTypes: `image/jpeg, image/png, image/webp, image/gif, application/pdf`
- status 체크 없음 (PENDING 셀러도 업로드 가능)

#### Step 3: `app/seller/auth/register/page.tsx`
추가 state:
```typescript
const [bizRegImageUrl, setBizRegImageUrl] = useState<string>("");
const [bizRegUploading, setBizRegUploading] = useState(false);
const [bizRegFileName, setBizRegFileName] = useState<string>("");
```

업로드 핸들러 (handleSubmit 위에):
```typescript
async function handleBizRegUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  setBizRegUploading(true);
  setBizRegFileName(file.name);
  setError("");
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/seller/biz-reg-upload", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? "업로드 실패");
      return;
    }
    const { url } = await res.json();
    setBizRegImageUrl(url);
  } catch {
    setError("파일 업로드 중 오류가 발생했습니다.");
  } finally {
    setBizRegUploading(false);
  }
}
```

handleSubmit 내 `setLoading(true)` 직후:
```typescript
if (!bizRegImageUrl) {
  setError("사업자등록증 이미지를 업로드해 주세요.");
  setLoading(false);
  return;
}
```

data 객체에 `bizRegImageUrl` 추가. JSX에 파일 input 추가 (bankAccount 입력 아래):
```tsx
<div className="space-y-2">
  <Label htmlFor="bizRegImage">
    사업자등록증 *
    <span className="ml-1 text-xs text-muted-foreground">(JPG/PNG/PDF, 5MB 이하)</span>
  </Label>
  <div className="flex items-center gap-2">
    <Input
      id="bizRegImage"
      type="file"
      accept="image/*,application/pdf"
      onChange={handleBizRegUpload}
      disabled={bizRegUploading}
      className="text-sm"
    />
    {bizRegUploading && (
      <span className="text-xs text-muted-foreground">업로드 중...</span>
    )}
  </div>
  {bizRegImageUrl && (
    <p className="text-xs text-green-600">✓ 업로드 완료: {bizRegFileName}</p>
  )}
</div>
```

#### Step 4: `app/api/sellers/register/route.ts`
- destructuring에 `bizRegImageUrl` 추가
- 필수 검증: `!bizRegImageUrl` 포함 → `"필수 항목을 모두 입력해주세요. (사업자등록증 이미지 포함)"`
- `prisma.seller.create` data에 `bizRegImageUrl` 추가

#### Step 5: `app/api/admin/sellers/route.ts`
- `select`에 `bizRegImageUrl: true` 추가

#### Step 6: `app/admin/sellers/page.tsx`
- `SellerItem` 인터페이스에 `bizRegImageUrl?: string | null` 추가
- `<TableHead>사업자등록증</TableHead>` 추가 (상태 열 앞)
- 각 행에 셀 추가:
```tsx
<TableCell>
  {seller.bizRegImageUrl ? (
    <a href={seller.bizRegImageUrl} target="_blank" rel="noopener noreferrer"
       className="text-xs text-blue-600 underline">보기</a>
  ) : (
    <span className="text-xs text-muted-foreground">미첨부</span>
  )}
</TableCell>
```

**완료 커밋:** `feat: Task 34 — 사업자등록증 이미지 업로드 (Vercel Blob)`

---

### ✅ Task 35: 카카오톡 챗봇 주문 시스템 — 웹훅 API

**우선순위:** HIGH (Phase 4 핵심)
**상태:** ✅ 완료 (2026-04-09, 커밋 a7183c7)

**배경:** LiveOrder v3 재가동 (2026-04-09). 구매자가 카카오톡 채널에서 코드 입력 → 챗봇이 상품 정보 표시 → 결제 링크 발송 플로우 구현.

**환경변수 (Vercel에 추가 필요):**
```
KAKAO_CHANNEL_ID          # 카카오 채널 ID
KAKAO_REST_API_KEY        # 카카오 REST API 키
KAKAO_BIZMSG_ACCESS_TOKEN # 카카오 비즈메시지 액세스 토큰 (철수토큰)
```

#### Step 1: `lib/kakao.ts` 신규 생성
```typescript
// 카카오 채널 메시지 발송 유틸

const KAKAO_API_BASE = "https://kapi.kakao.com";

export async function sendKakaoMessage(
  userId: string,
  message: KakaoMessage
): Promise<void> {
  const res = await fetch(`${KAKAO_API_BASE}/v1/api/talk/friends/message/default/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KAKAO_BIZMSG_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      receiver_uuids: [userId],
      template_object: message,
    }),
  });
  if (!res.ok) {
    console.error("[kakao] message send failed:", await res.text());
  }
}

export interface KakaoMessage {
  object_type: string;
  [key: string]: unknown;
}

export function buildProductCard(
  productName: string,
  price: number,
  stock: number,
  imageUrl: string | null,
  paymentUrl: string
): KakaoMessage {
  return {
    object_type: "commerce",
    content: {
      title: productName,
      image_url: imageUrl ?? "https://liveorder.vercel.app/og-image.png",
      image_width: 640,
      image_height: 640,
      description: `₩${price.toLocaleString()} | 재고: ${stock === 0 ? "무제한" : stock + "개"}`,
      link: { web_url: paymentUrl, mobile_web_url: paymentUrl },
    },
    commerce: {
      regular_price: price,
    },
    buttons: [
      {
        title: "결제하기",
        link: { web_url: paymentUrl, mobile_web_url: paymentUrl },
      },
    ],
  };
}
```

#### Step 2: `app/api/kakao/webhook/route.ts` 신규 생성

웹훅 수신 + 코드 처리 + 메시지 응답:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildProductCard, sendKakaoMessage } from "@/lib/kakao";
import { nanoid } from "nanoid";

const CODE_PATTERN = /[A-Z]{3}-\d{4}-[A-Z0-9]{4}/;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 카카오 웹훅 서명 검증 (선택 — KAKAO_REST_API_KEY 헤더 비교)
  // const signature = req.headers.get("X-Kakao-Signature");

  const userKey: string = body?.userRequest?.user?.id;
  const utterance: string = body?.userRequest?.utterance ?? "";

  const match = utterance.toUpperCase().match(CODE_PATTERN);
  if (!match) {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "코드를 입력해주세요.\n예: ABC-1234-XY01" } }],
      },
    });
  }

  const codeKey = match[0];

  // 코드 조회
  const code = await prisma.code.findUnique({
    where: { codeKey },
    include: { product: { include: { seller: true } } },
  });

  if (!code || !code.isActive || code.expiresAt < new Date()) {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "유효하지 않은 코드입니다. 코드를 다시 확인해 주세요." } }],
      },
    });
  }

  if (code.product.seller.status !== "APPROVED") {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "현재 이용할 수 없는 코드입니다." } }],
      },
    });
  }

  if (code.maxQty > 0 && code.usedQty >= code.maxQty) {
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "해당 코드는 수량이 소진되었습니다." } }],
      },
    });
  }

  // 결제 세션 토큰 생성 (30분 만료)
  const sessionToken = nanoid(32);
  await prisma.kakaoPaySession.create({
    data: {
      token: sessionToken,
      codeId: code.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  const paymentUrl = `${process.env.NEXTAUTH_URL}/kakao/${sessionToken}`;
  const card = buildProductCard(
    code.product.name,
    code.product.price,
    code.product.stock,
    code.product.imageUrl,
    paymentUrl
  );

  // 카카오 응답 포맷 (스킬 응답)
  return NextResponse.json({
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title: code.product.name,
            description: `가격: ₩${code.product.price.toLocaleString()}\n재고: ${code.product.stock === 0 ? "무제한" : code.product.stock + "개 남음"}`,
            thumbnail: code.product.imageUrl
              ? { imageUrl: code.product.imageUrl }
              : undefined,
            buttons: [
              {
                label: "결제하기",
                action: "webLink",
                webLinkUrl: paymentUrl,
              },
            ],
          },
        },
      ],
    },
  });
}
```

#### Step 3: `prisma/schema.prisma` — KakaoPaySession 모델 추가
```prisma
model KakaoPaySession {
  id        String   @id @default(uuid()) @db.Uuid
  token     String   @unique @db.VarChar(64)
  codeId    String   @map("code_id") @db.Uuid
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  code Code @relation(fields: [codeId], references: [id])

  @@map("kakao_pay_sessions")
}
```

`Code` 모델에 relation 추가:
```prisma
kakaoPaySessions KakaoPaySession[]
```

마이그레이션:
```bash
npx prisma migrate dev --name add_kakao_pay_session
```

**완료 커밋:** `feat: Task 35 — 카카오톡 챗봇 웹훅 API + KakaoPaySession`

---

### 🔧 Task 36: 카카오 결제 연결 웹 페이지

**우선순위:** HIGH (Task 35 완료 후 착수)
**상태:** ⬜ 미착수 (Task 35 완료됨 → 착수 가능)

**신규 파일:** `app/(buyer)/kakao/[token]/page.tsx`

기능:
1. URL의 `token` 파라미터로 `KakaoPaySession` 조회
2. 만료 시 에러 페이지 표시 ("링크가 만료되었습니다. 카카오 채널에서 코드를 다시 입력해 주세요.")
3. 유효하면 해당 코드의 상품 정보 표시
4. 수량 선택 UI (기존 `QuantitySelector` 컴포넌트 재사용)
5. "결제하기" 클릭 시 기존 `PaymentSummary` 결제 플로우로 연결
6. 결제 완료 후 배송지 입력 (`AddressForm`) → 주문 완료

**구현 스펙:**
```typescript
// app/(buyer)/kakao/[token]/page.tsx
// 1. GET KakaoPaySession by token
// 2. If expired: show error message
// 3. If valid: load code + product info
// 4. Render: KakaoOrderFlow (새 컴포넌트)
//   - ProductCard (상품 정보)
//   - QuantitySelector
//   - PaymentSummary (결제 버튼)
//   - → 결제 완료 후 AddressForm
//   - → 주문 완료 화면
```

**참조 파일:** `app/(buyer)/chat/page.tsx` + `stores/buyer-store.ts` (기존 채팅 플로우 참고)

**완료 커밋:** `feat: Task 36 — 카카오 결제 연결 페이지 (/kakao/[token])`

---

## 완료된 작업

| Task | 내용 | 커밋 |
|------|------|------|
| Task 21 | 셀러 이메일 인증 (B-22, P3-5) | 1ee50ab |
| Task 22 | 셀러 이메일 재발송 API | 1ee50ab |
| Task 23 | 관리자 주문 목록 + 환불 UI (P3-6) | 1ddddfc |
| Task 24 | 셀러 대시보드 recharts 차트 (P3-3) | 기구현 |
| Task 25 | 배송 추적 링크 (P3-4) | 기구현 |
| Task 26 | pgTid unique 제약 (B-28) | 1ddddfc |
| Task 27 | 환불 상태 처리 수정 (B-29) | 1ddddfc |
| Task 28 | 정산 배치 DELIVERED 포함 + sellerId FK (B-31) | 1ddddfc |
| Task 29 | 이메일 인증 토큰 만료 검증 24h (B-32) | 1ee50ab |
| Task 30 | seller/orders Skeleton + dashboard 에러 처리 | 9ffc548 |
| Task 31 | seller/orders 상태 필터 + data-deletion rate limiting | b57439d |
| Task 32 | QuantitySelector 무제한 UX + CSV export 10000건 상한 | 87052f1 |
| Task 33 | 청약확인 UI + 청약철회 API (전자상거래법 대응) | 012ec5a |
| Task 34 | 사업자등록증 이미지 업로드 (Vercel Blob) | 89f5fab |
| Task 35 | 카카오톡 챗봇 웹훅 API + KakaoPaySession | a7183c7 |
| B-28~B-33 | QA 버그 전체 수정 | 각 커밋 |
| P3-0~P3-8 | Phase 3 로드맵 | 완료 |
