# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Planner — Task 36 상세 스펙 수립)_

---

## ⚠️ 프로젝트 방향

**v1**: 기존 코드 유지 (그대로 둠)
**v2**: DROP (없음)
**v3**: 카카오톡 챗봇 기반 주문 시스템 — v1 코드 위에 확장

---

## 🚨 v3 핵심 기획 (Sanghun 확정 2026-04-09)

### 비즈니스 모델
- **플랫폼 제공자(우리)** — 오픈빌더 봇 관리, 스킬 서버 운영, 전체 인프라
- **판매자** — 카카오톡 비즈니스 채널 개설 + 상품 등록만
- **고객** — 카카오톡에서 판매자 채널 친구추가 → 챗봇으로 주문

### 아키텍처 (확정 2026-04-09)

**우리 채널 1개 + 봇 1개 + 판매자 선택 구조**

```
[liveorder 채널 1개] → [liveorder 봇 1개] → [스킬 서버]
                                                │
                                                ├→ 고객이 코드 입력
                                                ├→ 코드로 상품 DB 조회
                                                ├→ KakaoPaySession 생성
                                                ├→ commerceCard 응답
                                                └→ /kakao/[token] → 결제 진행
```

- 봇 이름: liveorder
- 봇 ID: 69d6729b9fac321ddc6b5d64

### 주문 플로우
1. 고객이 **liveorder 채널** 친구추가
2. 코드 입력 (예: ABC-1234-ABCD)
3. 봇이 상품 카드(commerceCard) + "결제하기" 버튼 전송
4. "결제하기" 클릭 → `/kakao/[token]` 접속
5. 토큰 검증 → 기존 채팅 결제 플로우 (수량 선택 → PortOne → 배송지 입력)
6. 주문 완료

---

## Dev1 현재 작업

### Task 36: 카카오 오픈빌더 스킬 서버 + 결제 연결 페이지

**구현해야 할 파일 3개:**

---

#### 36A: `app/api/kakao/webhook/route.ts`

카카오 오픈빌더 → POST /api/kakao/webhook

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// 카카오 스킬 서버 응답 헬퍼
function simpleTextResponse(text: string) {
  return NextResponse.json({
    version: '2.0',
    template: { outputs: [{ simpleText: { text } }] }
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const utterance: string = body?.userRequest?.utterance ?? ''

  // 코드 패턴 추출 (대소문자 무관)
  const codeMatch = utterance.toUpperCase().match(/[A-Z0-9]{3}-[0-9]{4}-[A-Z0-9]{4}/)
  if (!codeMatch) {
    return simpleTextResponse('상품 코드를 입력해주세요.\n예: ABC-1234-ABCD')
  }

  const codeKey = codeMatch[0]

  // DB 조회 (code + product + seller)
  const code = await db.code.findUnique({
    where: { codeKey },
    include: { product: { include: { seller: true } } }
  })

  // 유효성 검증
  if (!code) return simpleTextResponse('존재하지 않는 코드입니다.')
  if (!code.isActive) return simpleTextResponse('비활성화된 코드입니다.')
  if (code.expiresAt < new Date()) return simpleTextResponse('만료된 코드입니다.')
  if (code.maxQty > 0 && code.usedQty >= code.maxQty) return simpleTextResponse('품절된 상품입니다.')
  if (code.product.seller.status !== 'APPROVED') return simpleTextResponse('판매 중단된 상품입니다.')

  // 세션 토큰 생성 (32자 hex, 30분 만료)
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

  await db.kakaoPaySession.create({
    data: { token, codeId: code.id, expiresAt }
  })

  const paymentUrl = `${process.env.NEXTAUTH_URL}/kakao/${token}`
  const product = code.product

  // commerceCard 응답
  return NextResponse.json({
    version: '2.0',
    template: {
      outputs: [{
        commerceCard: {
          description: product.name,
          price: product.price,
          currency: 'won',
          thumbnails: [{
            imageUrl: product.imageUrl ?? 'https://liveorder.vercel.app/og-image.png',
            link: { web: paymentUrl, mobile_web: paymentUrl }
          }],
          profile: {
            thumbnail: 'https://liveorder.vercel.app/og-image.png',
            nickName: product.seller.name
          },
          buttons: [{
            label: '결제하기',
            action: 'webLink',
            webLinkUrl: paymentUrl
          }]
        }
      }]
    }
  })
}
```

---

#### 36B: `app/api/kakao/session/[token]/route.ts`

세션 토큰 검증 API (결제 페이지에서 호출)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const session = await db.kakaoPaySession.findUnique({
    where: { token },
    include: {
      code: {
        include: { product: { include: { seller: true } } }
      }
    }
  })

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: '만료된 링크입니다.' }, { status: 410 })
  }

  const { code } = session
  const product = code.product
  const seller = product.seller

  // /api/codes/[codeKey] 응답과 동일한 형식
  return NextResponse.json({
    valid: true,
    code: {
      id: code.id,
      codeKey: code.codeKey,
      maxQty: code.maxQty,
      usedQty: code.usedQty,
      remainingQty: code.maxQty === 0 ? null : code.maxQty - code.usedQty,
    },
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
    },
    seller: {
      name: seller.name,
      businessNo: seller.businessNo,
      tradeRegNo: seller.tradeRegNo,
    }
  })
}
```

---

#### 36C: `app/(buyer)/kakao/[token]/page.tsx`

카카오 결제 진입 페이지 (기존 `/order/[code]/page.tsx` 패턴 동일)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function KakaoPayPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    fetch(`/api/kakao/session/${token}`)
      .then((r) => {
        if (r.status === 410) throw new Error('만료된 링크입니다. 카카오톡에서 다시 시도해주세요.')
        if (!r.ok) throw new Error('서버 오류가 발생했습니다.')
        return r.json()
      })
      .then((data) => {
        if (!data.valid) {
          setError(data.error || '유효하지 않은 링크입니다.')
          return
        }
        // 기존 chat 페이지와 동일한 pendingCode 형식으로 저장
        sessionStorage.setItem(
          'pendingCode',
          JSON.stringify({ code: data.code.codeKey, data })
        )
        router.replace('/chat')
      })
      .catch((e) => setError(e.message || '오류가 발생했습니다.'))
  }, [token, router])

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 text-center space-y-4">
        <p className="text-destructive font-semibold">{error}</p>
        <a href="/" className="underline text-sm text-muted-foreground">
          처음으로 돌아가기
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 text-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">결제 페이지 로딩 중...</p>
    </div>
  )
}
```

---

### 구현 시 주의사항
1. `params` 타입: Next.js 16에서 `params`는 `Promise<{...}>` → `await params` 필요
2. `crypto`는 Node.js built-in (import 필요, nanoid 불필요)
3. `NEXTAUTH_URL` 환경변수로 paymentUrl 생성
4. 기존 `/api/codes/[codeKey]` 응답 형식과 맞춰야 `/chat`에서 올바르게 처리됨

### 완료 후 확인 사항
- `curl -X POST http://localhost:3000/api/kakao/webhook -H 'Content-Type: application/json' -d '{"userRequest":{"utterance":"ABC-1234-ABCD"}}'` 로 테스트
- commerceCard 응답의 `webLinkUrl`이 정상 URL인지 확인
- `/kakao/[token]` 접속 시 `/chat`으로 redirect 되는지 확인
- 만료 토큰 (수동 DB 수정) 접속 시 에러 메시지 표시 확인

---

## Planner 📋 역할

### 매 실행마다:
1. 기존 v1 코드 분석 → v3 확장 포인트 파악
2. 오픈빌더 봇 시나리오 설계 (대화 흐름, 블록 구조)
3. DB 스키마 설계 (판매자-봇 매핑, 상품, 주문, 배송)
4. API 설계 (스킬 서버 엔드포인트)
5. PLAN.md에 Phase별 기획 작성

---

## Dev1 📋 역할

### 매 실행마다:
1. TASKS.md에서 Dev1 할당 태스크 확인
2. PLAN.md에서 기획 내용 파악
3. 구현 → 테스트 → git add → commit → push
4. TASKS.md 업데이트

### 기술 규칙:
- 기존 v1 코드 구조 유지 — 새 기능은 별도 디렉토리/모듈로 추가
- DB 변경은 Prisma migration으로
- git user: kimeleven / kimeleven@gmail.com

---

## Dev2 📋 역할

### 매 실행마다:
1. TASKS.md에서 Dev2 할당 태스크 확인
2. 프론트엔드/관리자 페이지 구현
3. 판매자 관리자 페이지 (상품 등록, 주문 관리)
4. 구현 → 테스트 → git add → commit → push

---

## QA 📋 역할

### 매 실행마다:
1. 변경 파일만 검토 (git diff)
2. 스킬 서버 API 테스트
3. QA_REPORT.md 업데이트

---

## 로컬 환경
- 프로젝트: ~/eddy-agent/liveorder
- DB: PostgreSQL localhost:5432, liveorder
- GitHub: kimeleven/liveorder
- 기존 스택: Next.js + Prisma + PostgreSQL

---

## 완료된 작업

| Task | 내용 | 완료일 |
|------|------|--------|
| Task 34 | 사업자등록증 이미지 업로드 — `app/api/seller/biz-reg-upload/route.ts`, `app/seller/auth/register/page.tsx` UI, DB 마이그레이션 | 2026-04-09 |
| Task 35 | KakaoPaySession DB 마이그레이션 (`kakao_pay_sessions` 테이블), `lib/kakao.ts` 기본 구조, Prisma schema 반영 | 2026-04-09 |
| Task 1~33 | Phase 1+2+3 전체 기능 (v1 웹 플랫폼) | 2026-04-04 |

---

## 규칙
- Sanghun에게 직접 보고 금지 — Eddy가 통합 보고
- QA는 변경분만 검토 (토큰 절약)
- git user: kimeleven
