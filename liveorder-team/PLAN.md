# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09_

---

## 프로젝트 개요

기존 v1 웹 기반 주문 플랫폼 위에 **카카오톡 챗봇 주문 플로우** 추가.
- v1: Next.js 기반 웹 플랫폼 (Phase 1+2+3 완료)
- v3: 카카오 오픈빌더 스킬 서버 + 결제 연결 페이지

---

## 현재 상태 (2026-04-09)

### 완료된 작업
| Task | 내용 | 상태 |
|------|------|------|
| Task 34 | 사업자등록증 이미지 업로드 (Vercel Blob) | ✅ 완료 |
| Task 35 | KakaoPaySession DB 마이그레이션 + `lib/kakao.ts` | ✅ 완료 |

### 현재 진행
- **Task 36**: 카카오 오픈빌더 스킬 서버 + 결제 연결 웹페이지

---

## Phase 4: 카카오톡 챗봇 주문 시스템

### 아키텍처

```
[카카오 오픈빌더] → POST /api/kakao/webhook
                          │
                          ├→ 코드 유효성 검증
                          ├→ KakaoPaySession 생성 (32자 토큰, 30분 만료)
                          └→ commerceCard 응답 (결제하기 버튼 → /kakao/[token])

[구매자] 결제하기 클릭 → /kakao/[token]
                          │
                          ├→ GET /api/kakao/session/[token] 토큰 검증
                          ├→ codeKey + 상품 정보 획득
                          ├→ sessionStorage에 pendingCode 저장
                          └→ /chat 으로 redirect → 기존 결제 플로우
```

### Task 36 상세 스펙

#### 36A: 스킬 서버 웹훅 엔드포인트

**파일:** `app/api/kakao/webhook/route.ts`

**역할:** 카카오 오픈빌더에서 사용자 발화 수신 → 코드 검증 → 상품 카드 응답

**요청 형식 (카카오 오픈빌더 스킬 서버 표준):**
```json
{
  "userRequest": {
    "utterance": "ABC-1234-ABCD",
    "user": { "id": "kakao-user-id" }
  }
}
```

**응답 형식 (성공 — commerceCard):**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [{
      "commerceCard": {
        "description": "상품명",
        "price": 10000,
        "currency": "won",
        "thumbnails": [{
          "imageUrl": "상품 이미지 URL",
          "link": { "web": "https://liveorder.vercel.app/kakao/TOKEN" }
        }],
        "profile": {
          "thumbnail": "https://liveorder.vercel.app/og-image.png",
          "nickName": "판매자 상호명"
        },
        "buttons": [{
          "label": "결제하기",
          "action": "webLink",
          "webLinkUrl": "https://liveorder.vercel.app/kakao/TOKEN"
        }]
      }
    }]
  }
}
```

**응답 형식 (실패 — simpleText):**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [{ "simpleText": { "text": "오류 메시지" } }]
  }
}
```

**구현 로직:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json()
  const utterance: string = body?.userRequest?.utterance ?? ''

  // 코드 패턴 추출 ([A-Z0-9]{3}-[0-9]{4}-[A-Z0-9]{4})
  const codeMatch = utterance.toUpperCase().match(/[A-Z0-9]{3}-[0-9]{4}-[A-Z0-9]{4}/)
  if (!codeMatch) {
    return simpleText('코드를 입력해주세요.\n예: ABC-1234-ABCD')
  }

  // DB 조회: code + product + seller
  const code = await db.code.findUnique({
    where: { codeKey: codeMatch[0] },
    include: { product: { include: { seller: true } } }
  })

  // 유효성 검증 (순서: 존재 → isActive → expiresAt → maxQty → seller.status)
  // 실패 시 simpleText 응답

  // 세션 토큰 생성: crypto.randomBytes(16).toString('hex') (32자)
  // KakaoPaySession DB 저장 (token, codeId, expiresAt = now + 30min)

  // commerceCard 응답 반환
}
```

**토큰 생성:** `crypto.randomBytes(16).toString('hex')` (nanoid 미사용, Node.js 내장 crypto)

---

#### 36B: 세션 조회 API

**파일:** `app/api/kakao/session/[token]/route.ts`

**역할:** 토큰 유효성 검증 → codeKey + 상품 정보 반환

```typescript
// GET /api/kakao/session/[token]
// 응답: { codeKey, code: {...}, product: {...}, seller: {...} }
// 만료/없음: 410 Gone

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await db.kakaoPaySession.findUnique({
    where: { token: params.token },
    include: {
      code: {
        include: { product: { include: { seller: true } } }
      }
    }
  })

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: '만료된 링크입니다.' }, { status: 410 })
  }

  // /api/codes/[codeKey] 응답과 동일한 형식으로 반환
  // { valid: true, code: {...}, product: {...}, seller: {...} }
}
```

---

#### 36C: 카카오 결제 진입 페이지

**파일:** `app/(buyer)/kakao/[token]/page.tsx`

**역할:** 토큰 검증 → sessionStorage pendingCode 저장 → /chat redirect

기존 `/order/[code]/page.tsx`와 동일한 패턴 (코드 대신 토큰으로 진입).

```typescript
// 1. GET /api/kakao/session/[token] 호출
// 2. 유효하면: sessionStorage.setItem('pendingCode', JSON.stringify({ code: codeKey, data }))
//             → router.replace('/chat')
// 3. 만료/오류: 에러 메시지 + "처음으로 돌아가기" 링크
```

---

## 다음 단계 (Task 37 이후)

- **Task 37**: 카카오 채널 연동 테스트 (오픈빌더 스킬 서버 URL 등록)
- **Task 38**: 택배사 API 연동 (실시간 배송 추적)
- **Task 39**: 셀러 알림톡 발송 (주문 접수 시)

---

## 기술 규칙
- v1 코드 구조 유지 — 새 기능은 별도 디렉토리 (`app/api/kakao/`, `app/(buyer)/kakao/`)
- DB 변경은 Prisma migration
- 토큰 생성: `crypto.randomBytes(16).toString('hex')` (nanoid 없음, Node.js built-in)
- 카카오 오픈빌더 응답 타임아웃: 5초 → DB 조회 최적화 필요
