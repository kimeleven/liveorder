# LiveOrder v3 — 팀 태스크 현황
_Eddy(PM) 관리_
_최종 업데이트: 2026-04-09 (Planner — Task 38 완료 확인 + Task 39 스펙 수립)_

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
                                                ├→ 봇 ID 검증 (KAKAO_BOT_ID)
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

### Task 39: 카카오 세션 자동 정리 cron + 웹훅 봇 ID 검증

**우선순위:** HIGH
**이유:** 만료 세션 DB 누적 방지 (운영 안정성) + 무단 webhook 호출 차단 (보안)

---

#### 39A: 세션 정리 Cron 생성

**파일 생성:** `app/api/cron/kakao-session-cleanup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }
  }

  try {
    const result = await prisma.kakaoPaySession.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    console.error('[kakao-session-cleanup] 실패:', e)
    return NextResponse.json({ error: '정리 실패' }, { status: 500 })
  }
}
```

---

#### 39B: vercel.json cron 추가

**파일 수정:** `vercel.json`

기존:
```json
{
  "crons": [
    { "path": "/api/cron/settlements", "schedule": "0 9 * * *" }
  ]
}
```

수정 후:
```json
{
  "crons": [
    { "path": "/api/cron/settlements", "schedule": "0 9 * * *" },
    { "path": "/api/cron/kakao-session-cleanup", "schedule": "0 3 * * *" }
  ]
}
```

---

#### 39C: 웹훅 봇 ID 검증 추가

**파일 수정:** `app/api/kakao/webhook/route.ts`

`POST` 함수 내 utterance 추출 **이전**에 다음 코드 삽입:

```typescript
// 봇 ID 검증 (환경변수 설정 시에만 검증 — 개발 환경에서는 KAKAO_BOT_ID 미설정으로 스킵)
const expectedBotId = process.env.KAKAO_BOT_ID
if (expectedBotId) {
  const botId = body?.bot?.id
  if (botId !== expectedBotId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

**주의:** `body`는 이미 `await req.json()` 후이므로 `body?.bot?.id` 접근 가능.

---

#### 39D: 완료 후 검증

```bash
# 1. 세션 정리 cron 로컬 테스트
curl -X POST http://localhost:3000/api/cron/kakao-session-cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
# 기대: { "ok": true, "deleted": 0, "timestamp": "..." }

# 2. 봇 ID 검증 테스트 (KAKAO_BOT_ID 환경변수 설정 필요)
# .env.local에 KAKAO_BOT_ID=69d6729b9fac321ddc6b5d64 추가 후:
curl -X POST http://localhost:3000/api/kakao/webhook \
  -H 'Content-Type: application/json' \
  -d '{"bot":{"id":"WRONG_ID"},"userRequest":{"utterance":"ABC-1234-ABCD"}}'
# 기대: 403 Forbidden

# 3. 정상 요청 (올바른 봇 ID)
curl -X POST http://localhost:3000/api/kakao/webhook \
  -H 'Content-Type: application/json' \
  -d '{"bot":{"id":"69d6729b9fac321ddc6b5d64"},"userRequest":{"utterance":"ABC-1234-ABCD"}}'
# 기대: 코드 존재 시 commerceCard, 없으면 simpleText
```

---

#### 39 완료 조건

- [ ] `app/api/cron/kakao-session-cleanup/route.ts` 생성
- [ ] `vercel.json`에 cleanup cron 추가
- [ ] `app/api/kakao/webhook/route.ts`에 봇 ID 검증 추가
- [ ] 로컬 테스트 성공 (cron 수동 호출 200, 잘못된 봇 ID 403)
- [ ] git commit + push

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
| Task 38 | `docs/kakao-openbuilder-setup.md` 문서 작성, 셀러 코드 페이지 카카오 공지 복사 버튼, 셀러 대시보드 카카오 채널 안내 카드 | 2026-04-09 |
| Task 37 | `/api/kakao/session/[token]` seller 응답에 `id` 누락 버그 수정 → FlowSeller 타입 불일치 해결 | 2026-04-09 |
| Task 36 | 스킬 서버 webhook (commerceCard 응답), 세션 검증 API `/api/kakao/session/[token]`, 카카오 결제 진입 페이지 `/kakao/[token]` | 2026-04-09 |
| Task 35 | KakaoPaySession DB 마이그레이션 (`kakao_pay_sessions` 테이블), `lib/kakao.ts` 기본 구조, Prisma schema 반영 | 2026-04-09 |
| Task 34 | 사업자등록증 이미지 업로드 — `app/api/seller/biz-reg-upload/route.ts`, `app/seller/auth/register/page.tsx` UI, DB 마이그레이션 | 2026-04-09 |
| Task 1~33 | Phase 1+2+3 전체 기능 (v1 웹 플랫폼) | 2026-04-04 |

---

## 규칙
- Sanghun에게 직접 보고 금지 — Eddy가 통합 보고
- QA는 변경분만 검토 (토큰 절약)
- git user: kimeleven
