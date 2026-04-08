# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 38 완료 반영, Task 39 스펙 수립)_

---

## 프로젝트 개요

기존 v1 웹 기반 주문 플랫폼 위에 **카카오톡 챗봇 주문 플로우** 추가.
- v1: Next.js 기반 웹 플랫폼 (Phase 1+2+3 완료)
- v3: 카카오 오픈빌더 스킬 서버 + 결제 연결 페이지

---

## 현재 상태 (2026-04-09)

### Phase 4 완료된 작업
| Task | 내용 | 상태 |
|------|------|------|
| Task 34 | 사업자등록증 이미지 업로드 (Vercel Blob) | ✅ 완료 |
| Task 35 | KakaoPaySession DB 마이그레이션 + `lib/kakao.ts` | ✅ 완료 |
| Task 36 | 스킬 서버 webhook (commerceCard), 세션 API, 카카오 결제 진입 페이지 | ✅ 완료 |
| Task 37 | `/api/kakao/session/[token]` seller.id 누락 버그 수정 | ✅ 완료 |
| Task 38 | OpenBuilder 설정 문서 + 셀러 코드 페이지 카카오 공지 복사 버튼 + 셀러 대시보드 안내 카드 | ✅ 완료 |

### 현재 진행
- **Task 39**: 카카오 세션 자동 정리 cron + 웹훅 봇 ID 검증 (보안/운영 안정화)

---

## 시스템 아키텍처 (확정)

```
[카카오 오픈빌더] → POST /api/kakao/webhook
                          │
                          ├→ 봇 ID 검증 (KAKAO_BOT_ID 환경변수)
                          ├→ 코드 패턴 추출 + DB 유효성 검증
                          ├→ KakaoPaySession 생성 (32자 토큰, 30분 만료)
                          └→ commerceCard 응답 (결제하기 → /kakao/[token])

[구매자] 결제하기 클릭 → /kakao/[token]
                          │
                          ├→ GET /api/kakao/session/[token] 검증
                          ├→ sessionStorage pendingCode 저장
                          └→ /chat redirect → 기존 결제 플로우

[Vercel Cron 매일 03:00] → DELETE expired kakao_pay_sessions
```

---

## Phase 4: Task 39 상세 스펙

### 배경 / 문제

1. **DB 누적 문제**: `kakao_pay_sessions` 테이블에 만료된 세션이 정리 없이 계속 쌓임
   - 30분마다 새 세션 생성 → 무한 증가
   - 정리 cron 없음
2. **보안 취약점**: `/api/kakao/webhook` 엔드포인트에 봇 ID 검증 없음
   - 누구나 임의의 POST 요청으로 세션을 생성할 수 있음
   - 봇 ID: `69d6729b9fac321ddc6b5d64` (TASKS.md에 명시됨)

---

### Task 39A: 세션 정리 Cron

**파일:** `app/api/cron/kakao-session-cleanup/route.ts`

**역할:** 만료된 `KakaoPaySession` 레코드를 일괄 삭제

**인증:** 기존 settlements cron과 동일하게 `CRON_SECRET` Bearer 토큰

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

**스케줄:** 매일 새벽 3시 (`0 3 * * *`) — 부하가 적은 시간대

---

### Task 39B: vercel.json cron 추가

**파일:** `vercel.json` (기존 파일 수정)

현재:
```json
{
  "crons": [
    { "path": "/api/cron/settlements", "schedule": "0 9 * * *" }
  ]
}
```

추가 후:
```json
{
  "crons": [
    { "path": "/api/cron/settlements", "schedule": "0 9 * * *" },
    { "path": "/api/cron/kakao-session-cleanup", "schedule": "0 3 * * *" }
  ]
}
```

---

### Task 39C: 웹훅 봇 ID 검증

**파일:** `app/api/kakao/webhook/route.ts` (기존 파일 수정)

**추가 위치:** `POST` 함수 최상단 (utterance 추출 전)

카카오 오픈빌더 요청 본문 구조:
```json
{
  "bot": { "id": "69d6729b9fac321ddc6b5d64", "name": "liveorder" },
  "userRequest": { "utterance": "ABC-1234-ABCD" }
}
```

추가 코드:
```typescript
// 봇 ID 검증 (환경변수 없으면 개발 환경으로 허용)
const expectedBotId = process.env.KAKAO_BOT_ID
if (expectedBotId) {
  const botId = body?.bot?.id
  if (botId !== expectedBotId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

**환경변수:** `KAKAO_BOT_ID=69d6729b9fac321ddc6b5d64`

**중요:** `KAKAO_BOT_ID` 미설정 시 검증 스킵 → 개발/테스트 환경에서 curl 테스트 가능

---

### Task 39 완료 후 확인

```bash
# 세션 정리 cron 수동 테스트
curl -X POST http://localhost:3000/api/cron/kakao-session-cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
# 응답: { "ok": true, "deleted": N, "timestamp": "..." }

# 봇 ID 검증 테스트 (잘못된 봇 ID)
KAKAO_BOT_ID=69d6729b9fac321ddc6b5d64
curl -X POST http://localhost:3000/api/kakao/webhook \
  -H 'Content-Type: application/json' \
  -d '{"bot":{"id":"WRONG_ID"},"userRequest":{"utterance":"ABC-1234-ABCD"}}'
# 응답: 403 Forbidden

# 정상 요청 테스트 (봇 ID 없는 개발 환경)
curl -X POST http://localhost:3000/api/kakao/webhook \
  -H 'Content-Type: application/json' \
  -d '{"userRequest":{"utterance":"ABC-1234-ABCD"}}'
# 응답: commerceCard or simpleText
```

---

## Task 40 (다음 단계 예정): 주문 소스 추적

### 배경
현재 카카오 채널을 통해 들어온 주문과 웹 직접 입력 주문이 구분되지 않음.
셀러가 주문 목록에서 "카카오 채널 주문"을 식별할 수 없음.

### 계획 (스펙은 Task 39 완료 후 상세 수립)

**DB 변경:** `orders` 테이블에 `source` 필드 추가
```
source  VARCHAR(20) DEFAULT 'web'  -- 'web' | 'kakao'
```

**흐름:**
1. `KakaoPaySession`에 연결된 주문은 `source: 'kakao'` 자동 설정
2. `/api/payments/confirm/route.ts` — sessionStorage에 kakao 플래그가 있으면 `source: 'kakao'` 저장
3. 셀러 주문 목록 — `[카카오]` 배지 표시

---

## 기술 규칙
- v1 코드 구조 유지 — 새 기능은 별도 디렉토리 (`app/api/kakao/`, `app/(buyer)/kakao/`)
- DB 변경은 Prisma migration
- 토큰 생성: `crypto.randomBytes(16).toString('hex')` (nanoid 없음, Node.js built-in)
- 카카오 오픈빌더 응답 타임아웃: 5초 → DB 조회는 최소화
- Cron 인증: `CRON_SECRET` Bearer (기존 settlements cron과 동일 방식)
