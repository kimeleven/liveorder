# LiveOrder v3 프로젝트 계획
_Planner 관리 | Eddy가 방향 조정_
_최종 업데이트: 2026-04-09 (Task 44 완료 확인, Task 45 스펙 수립)_

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
| Task 39 | 카카오 세션 자동 정리 cron + 웹훅 봇 ID 검증 | ✅ 완료 |
| Task 40 | 주문 소스 추적 (`source: 'web' \| 'kakao'`) — DB 스키마, 결제 API, 셀러 주문 목록 카카오 배지 UI | ✅ 완료 |
| Task 41 | 카카오 세션 일회성 보장 (즉시 삭제) + CSV 주문경로 컬럼 추가 | ✅ 완료 |
| Task 42 | 셀러 대시보드 채널별 통계 (카카오 vs 웹, 최근 30일) | ✅ 완료 |
| Task 43 | 운송장 일괄 CSV 업로드 (export 주문ID, bulk API, UI 다이얼로그) | ✅ 완료 |
| Task 44 | 셀러 주문 30초 자동갱신, PAID 배지 API+SellerShell 폴링, 대시보드 주별/월별 차트 | ✅ 완료 |

### 현재 진행
- **Task 45**: 셀러 설정 페이지 (현재 `/seller/settings` 클릭 시 404)

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
                          ├→ GET /api/kakao/session/[token] 검증 + 즉시 삭제
                          ├→ sessionStorage pendingCode 저장
                          ├→ sessionStorage kakaoSource='true' 저장
                          └→ /chat redirect → 기존 결제 플로우

[PaymentSummary] → POST /api/payments/confirm
                          │
                          ├→ sessionStorage에서 kakaoSource 읽기
                          ├→ body에 source: 'kakao' | 'web' 포함
                          └→ 결제 완료 후 셀러 이메일 알림

[Vercel Cron 매일 03:00] → DELETE expired kakao_pay_sessions
[셀러 CSV 다운로드] → 주문ID + 주문경로 컬럼 포함 (웹/카카오) ← Task 43 완료
[셀러 운송장 일괄 업로드] → POST /api/seller/orders/tracking/bulk ← Task 43 완료
[셀러 대시보드] → 채널별 주문 비율 통계 (최근 30일) ← Task 42 완료

[셀러 주문 목록] → 30초 자동 갱신 ← Task 44 완료
[SellerShell 헤더] → 미처리(PAID) 주문 수 배지 (60초 폴링) ← Task 44 완료
[셀러 대시보드 차트] → 주별/월별 탭 ← Task 44 완료

[셀러 설정 페이지] → /seller/settings ← Task 45 예정
[API] GET|PATCH /api/seller/me → 셀러 프로필 조회/수정 ← Task 45 예정
[API] POST /api/seller/me/password → 비밀번호 변경 ← Task 45 예정
```

---

## Phase 5: Task 45 상세 스펙

### 배경 / 목적

현재 `SellerShell` 네비게이션에 **설정** 메뉴(`/seller/settings`)가 존재하나 페이지가 없어 404 반환.
셀러가 정산 계좌, 연락처, 주소를 변경할 방법이 없어 운영 불편.

---

### Task 45A: `/api/seller/me` PATCH 핸들러 추가

**파일 수정:** `app/api/seller/me/route.ts`

기존 `GET`에 `PATCH` 핸들러 추가:

```typescript
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // 수정 허용 필드만 추출 (사업자번호·이메일·이름 수정 불가)
  const allowed = ['phone', 'address', 'bankAccount', 'bankName', 'tradeRegNo'] as const
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'string') data[key] = body[key].trim()
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const seller = await prisma.seller.update({
    where: { id: session.user.id },
    data,
    select: { phone: true, address: true, bankAccount: true, bankName: true, tradeRegNo: true },
  })

  return NextResponse.json(seller)
}
```

또한 기존 `GET` 핸들러 수정 — 설정 페이지에 필요한 전체 필드 반환:
```typescript
select: {
  status: true, name: true, email: true,
  repName: true, businessNo: true,
  phone: true, address: true,
  bankAccount: true, bankName: true, tradeRegNo: true,
  plan: true, createdAt: true,
}
```

**완료 조건:**
- [ ] `PATCH /api/seller/me` — phone/address/bankAccount/bankName/tradeRegNo 수정 처리
- [ ] `GET /api/seller/me` — 설정 페이지용 전체 필드 반환

---

### Task 45B: `/api/seller/me/password/route.ts` 신규 생성

**파일 신규 생성:** `app/api/seller/me/password/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다' }, { status: 400 })
  }

  const seller = await prisma.seller.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })
  if (!seller) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword, seller.password)
  if (!valid) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.seller.update({
    where: { id: session.user.id },
    data: { password: hashed },
  })

  return NextResponse.json({ ok: true })
}
```

**완료 조건:**
- [ ] `POST /api/seller/me/password` — 현재 비밀번호 검증 후 새 비밀번호 저장
- [ ] 8자 미만 비밀번호 거부
- [ ] 현재 비밀번호 불일치 시 400 반환

---

### Task 45C: `/seller/settings/page.tsx` 신규 생성

**파일 신규 생성:** `app/seller/settings/page.tsx`

**레이아웃:** 상단 2열 카드, 하단 비밀번호 변경 카드

```
┌──────────────────────────────────────────────────────┐
│ 설정                                                  │
├─────────────────────────┬────────────────────────────┤
│ 기본 정보 (읽기 전용)    │ 연락처 / 계좌 정보 (수정)  │
│                          │                            │
│ 이름: 홍길동 상호        │ 연락처: [010-1234-5678]    │
│ 이메일: a@b.com          │ 주소: [서울시...]           │
│ 사업자번호: 123-45-67890 │ 은행명: [국민은행]         │
│ 대표자명: 홍길동         │ 계좌번호: [123456789012]   │
│ 가입일: 2026-04-01      │ 통신판매업신고번호: [...]   │
│ 플랜: FREE               │ [저장]                     │
└─────────────────────────┴────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ 비밀번호 변경                                         │
│ 현재 비밀번호: [________]                            │
│ 새 비밀번호: [________] (8자 이상)                   │
│ 새 비밀번호 확인: [________]                         │
│ [변경]                                               │
└──────────────────────────────────────────────────────┘
```

**구현 골격:**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'  // or useToast

type SellerProfile = {
  name: string; email: string; repName: string; businessNo: string
  phone: string; address: string; bankAccount: string | null
  bankName: string | null; tradeRegNo: string | null
  plan: string; createdAt: string; status: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [saving, setSaving] = useState(false)
  // 수정 폼 state
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankName, setBankName] = useState('')
  const [tradeRegNo, setTradeRegNo] = useState('')
  // 비밀번호 변경 state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    fetch('/api/seller/me')
      .then(r => r.json())
      .then((data: SellerProfile) => {
        setProfile(data)
        setPhone(data.phone ?? '')
        setAddress(data.address ?? '')
        setBankAccount(data.bankAccount ?? '')
        setBankName(data.bankName ?? '')
        setTradeRegNo(data.tradeRegNo ?? '')
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/seller/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, address, bankAccount, bankName, tradeRegNo }),
      })
      if (!res.ok) throw new Error('저장 실패')
      // toast 성공 메시지
    } catch {
      // toast 실패 메시지
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange() {
    if (newPw !== confirmPw) {
      // 비밀번호 불일치 toast
      return
    }
    setChangingPw(true)
    try {
      const res = await fetch('/api/seller/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '변경 실패')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      // toast 성공 메시지
    } catch (e: unknown) {
      // toast 실패 메시지
    } finally {
      setChangingPw(false)
    }
  }

  if (!profile) return <div className="p-8">로딩 중...</div>

  // JSX 반환 — 위 레이아웃대로 구현
}
```

**toast 처리:**
- 프로젝트에 `sonner` 또는 `shadcn/ui useToast`가 있는지 먼저 확인.
  ```bash
  grep -r "toast\|sonner" /Users/a1111/eddy-agent/liveorder/components --include="*.tsx" -l | head -3
  ```
- 있는 것 재사용, 없으면 `alert()` 임시 사용 후 별도 TODO 주석.

**완료 조건:**
- [ ] `/seller/settings` 접근 시 404 대신 설정 페이지 렌더링
- [ ] 기본 정보 섹션 (읽기 전용): 이름, 이메일, 사업자번호, 대표자명, 플랜, 가입일
- [ ] 연락처/계좌 정보 수정 폼: phone, address, bankAccount, bankName, tradeRegNo
- [ ] 저장 버튼 클릭 → `PATCH /api/seller/me` 호출 → 성공/실패 피드백
- [ ] 비밀번호 변경 섹션: 현재/새/확인 입력 → `POST /api/seller/me/password` 호출

---

### Task 45D: 회원가입 이용약관 동의 체크박스 추가

**파일 수정:** `app/seller/auth/register/page.tsx`

현재 회원가입 폼에 약관 동의 체크박스가 없음 (법적 의무 — 전자상거래법).

**추가할 state:**
```typescript
const [termsAgreed, setTermsAgreed] = useState(false)
const [sellerTermsAgreed, setSellerTermsAgreed] = useState(false)
```

**폼 제출 버튼 위에 추가할 UI:**
```tsx
<div className="space-y-2 rounded-md border p-4 bg-muted/40">
  <p className="text-sm font-medium">이용 약관 동의 (필수)</p>
  <label className="flex items-start gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={termsAgreed}
      onChange={e => setTermsAgreed(e.target.checked)}
      className="mt-0.5"
    />
    <span className="text-sm">
      <a href="/terms" target="_blank" className="underline text-primary">이용약관</a>에 동의합니다 (필수)
    </span>
  </label>
  <label className="flex items-start gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={sellerTermsAgreed}
      onChange={e => setSellerTermsAgreed(e.target.checked)}
      className="mt-0.5"
    />
    <span className="text-sm">
      <a href="/seller-terms" target="_blank" className="underline text-primary">판매자 이용약관</a>에 동의합니다 (필수)
    </span>
  </label>
</div>
```

**제출 버튼 비활성화 조건에 약관 동의 추가:**
```typescript
disabled={loading || !termsAgreed || !sellerTermsAgreed}
```

**`/seller-terms` 페이지 확인:** `Requirements/LIVEORDER_판매자약관.md` 파일이 있으므로 해당 내용으로 정적 페이지 생성.

파일 경로 확인:
```bash
ls /Users/a1111/eddy-agent/liveorder/app/\(buyer\)/terms/ 2>/dev/null
ls /Users/a1111/eddy-agent/liveorder/app/seller-terms/ 2>/dev/null
```

약관 페이지가 없으면 `/app/(buyer)/seller-terms/page.tsx` 생성 (정적 내용).

**완료 조건:**
- [ ] 회원가입 폼에 이용약관 + 판매자약관 동의 체크박스 추가
- [ ] 미동의 시 제출 버튼 비활성화
- [ ] 약관 링크 클릭 시 새 탭에서 약관 내용 표시 (기존 `/terms` 또는 새로 생성)

---

### Task 45 전체 완료 조건

- [ ] `app/api/seller/me/route.ts` — GET 반환 필드 확장 + PATCH 핸들러 추가 (45A)
- [ ] `app/api/seller/me/password/route.ts` — 비밀번호 변경 API 신규 생성 (45B)
- [ ] `app/seller/settings/page.tsx` — 설정 페이지 신규 생성 (45C)
- [ ] `app/seller/auth/register/page.tsx` — 이용약관 동의 체크박스 추가 (45D)
- [ ] git commit + push

---

## 기술 규칙
- v1 코드 구조 유지 — 새 기능은 별도 디렉토리 (`app/api/kakao/`, `app/(buyer)/kakao/`)
- DB 변경은 Prisma migration
- 토큰 생성: `crypto.randomBytes(16).toString('hex')` (nanoid 없음, Node.js built-in)
- 카카오 오픈빌더 응답 타임아웃: 5초 → DB 조회는 최소화
- Cron 인증: `CRON_SECRET` Bearer (기존 settlements cron과 동일 방식)

---

## Vercel 배포 환경변수 체크리스트 (운영팀 전달용)

```
필수:
[ ] DATABASE_URL
[ ] NEXTAUTH_SECRET (32자 이상)
[ ] NEXTAUTH_URL (프로덕션 URL, 예: https://liveorder.vercel.app)
[ ] PORTONE_API_KEY
[ ] PORTONE_STORE_ID
[ ] PORTONE_API_SECRET (환불 필수)
[ ] BLOB_READ_WRITE_TOKEN (Vercel Blob)
[ ] CRON_SECRET (카카오 세션 정리 cron 인증)
[ ] RESEND_API_KEY (이메일 알림)
[ ] KAKAO_BOT_ID=69d6729b9fac321ddc6b5d64

프론트엔드 (NEXT_PUBLIC):
[ ] NEXT_PUBLIC_PORTONE_STORE_ID
[ ] NEXT_PUBLIC_PORTONE_CHANNEL_KEY

선택:
[ ] ADMIN_EMAIL (미설정 시 admin@liveorder.app 폴백)
[ ] PLATFORM_FEE_RATE (미설정 시 0.025)
[ ] SETTLEMENT_DELAY_DAYS (미설정 시 3)
```
