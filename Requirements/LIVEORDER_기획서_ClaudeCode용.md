# LIVEORDER — 라이브커머스 주문·결제 플랫폼
## Claude Code 개발 기획서 v2.4
> 작성일: 2026년 3월 | 최종 수정: 2026년 4월 9일 | 플랫폼 포지션: 통신판매중개업자

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-04-09 | v2.4 | Task 37 완료 (seller.id 버그 수정). Phase 4 핵심 플로우 완전 구현. Task 38 스펙: `docs/kakao-openbuilder-setup.md` + 셀러 코드 페이지 카카오 공지 복사 버튼 + 셀러 대시보드 카카오 채널 안내 카드. |
| 2026-04-09 | v2.3 | Task 36 완료 확인 (webhook + session API + 카카오 결제 진입 페이지 모두 구현됨). Task 37 버그 발견: `/api/kakao/session/[token]` seller 응답에 `id` 누락 → FlowSeller 타입 불일치. Task 37 수정 + 오픈빌더 연동 문서화 스펙 수립. |
| 2026-04-09 | v2.2 | Task 34+35 완료 확인. Task 36 스킬 서버 스펙 확정 (webhook + session API + 카카오 결제 진입 페이지). Phase 4 API 명세 업데이트. |
| 2026-04-09 | v2.1 | Phase 4 카카오톡 챗봇 주문 시스템 추가. Task 34 (사업자등록증 업로드) 미구현 재확인. 팀 재가동. |
| 2026-04-04 | v2.0 | 기획서 전면 업데이트: 현재 구현 상태 반영 (Phase 1+2 완료, Phase 3 진행 중), 실제 기술 스택 반영 (PortOne/Neon/Vercel Blob 등), DB 스키마 Prisma 기준 동기화, 구현 상태 표시 추가 (✅/🔧/⬜), 코드에서 발견된 미문서 기능 추가 (이메일 인증, 청약철회, 데이터 삭제권 등) |
| 2026-03 | v1.0 | 초기 기획서 작성 |

---

## 1. 프로젝트 개요

### 1.1 배경 및 목적

현재 유튜브, 틱톡 등 라이브 커머스에서 물품 판매 시 결제 프로세스는 아래와 같이 비효율적으로 운영되고 있다.

```
기존 방식
카카오톡 친구 등록 → 계좌이체 → 주소 수집 (DM) → 수기 정리 → 배송
```

본 플랫폼은 이 과정을 **"코드 입력 하나"** 로 단일화하여 셀러와 구매자 모두의 편의를 극대화하는 것을 목적으로 한다.

### 1.2 핵심 가치 제안

| 대상 | 기존 방식 | LIVEORDER 방식 | 개선 효과 |
|------|-----------|----------------|-----------|
| 셀러 | 카톡 채널 운영 + 수기 주소 정리 | 코드 발급 → 대시보드 자동 집계 | 운영 시간 80% 단축 |
| 구매자 | 계좌이체 + 개별 메시지 전송 | 코드 입력 → 카드결제 → 완료 | 구매 소요시간 3분 이내 |
| 플랫폼 | 없음 | 결제 중개 + 정산 수수료 | 신규 수익 모델 창출 |

### 1.3 법적 사업자 구조

> ⚠️ **중요: 법적 포지셔닝**
>
> - 본 플랫폼은 **통신판매중개업자**로 등록 운영 (전자상거래법 제20조)
> - 결제는 **외부 PG사(PortOne V2) 지급대행 서비스** 활용
> - 플랫폼은 주문 접수 + 결제 중개 + 배송정보 전달 + 정산 역할
> - 상품의 품질·적법성 책임은 **셀러에게 귀속** (약관으로 명시)

---

## 2. 전체 시스템 아키텍처

### 2.1 서비스 플로우

```
[셀러] 상품 등록 + 코드 발급 (QR코드 자동 생성)
        ↓
[셀러] 라이브 방송 중 코드/QR 공지 (유튜브/틱톡 — 플랫폼 관여 없음)
        ↓
[구매자] liveorder.kr 접속 → 코드 입력 (또는 QR 스캔으로 자동 입력)
        ↓
[시스템] 코드 유효성 검증 → 상품 정보 + 셀러 정보 표시
        ↓
[구매자] 수량 선택 → PG사 결제창 → 결제 완료
        ↓
[구매자] 배송지 입력 → 주문 확정
        ↓
[셀러] 대시보드 주문 확인 → 배송지 CSV 다운로드 → 발송
        ↓
[시스템] 배송 완료 확인 → D+3 자동 정산 (크론 배치)
```

| 단계 | 행위자 | 액션 | 시스템 처리 | 구현 상태 |
|------|--------|------|-------------|-----------|
| 1 | 셀러 | 상품 등록 + 코드 발급 요청 | 코드 생성 (형식: AAA-0000-XXXX), 유효기간·수량 설정, QR 자동 생성 | ✅ |
| 2 | 셀러 | 라이브 방송 중 코드 공지 | 외부 시스템 — 플랫폼 관여 없음 | — |
| 3 | 구매자 | 플랫폼 접속 + 코드 입력 | 코드 유효성 검증, 상품 정보 표시 (채팅 UI) | ✅ |
| 4 | 구매자 | 수량 선택 + 결제 진행 | PG사 결제창 호출 (PortOne V2), 결제 완료 처리 (레이스 컨디션 방지) | ✅ |
| 5 | 구매자 | 배송지 입력 + 주문 확인 | 주문 DB 저장, 셀러 이메일 알림 발송 | ✅ |
| 6 | 셀러 | 주문 목록 확인 + 배송 처리 | 배송지 CSV 다운로드 (UTF-8 BOM), 운송장 등록 UI | ✅ |
| 7 | 플랫폼 | 배송 완료 확인 후 정산 | D+3 크론 배치 정산, settlementId FK 연결 | ✅ |

### 2.2 기술 스택 (실제 적용)

**Frontend**
- Next.js (App Router) + TypeScript ✅
- Tailwind CSS ✅
- shadcn/ui 컴포넌트 ✅
- recharts (차트) ✅
- Zustand (클라이언트 상태 — buyer-store) ✅

**Backend**
- Next.js API Routes (App Router) ✅
- PostgreSQL (Neon Serverless) ✅
- Prisma ORM (driverAdapters 프리뷰) ✅
- PortOne V2 SDK (PG 연동) ✅
- Vercel Blob (이미지 스토리지) ✅
- Resend (이메일 알림) ✅
- NextAuth.js v5 (인증 — HKDF JWE) ✅

**Infra**
- Vercel (배포 + 서버리스) ✅
- Neon (Serverless PostgreSQL) ✅
- Vercel Blob (파일 스토리지) ✅

> **기획서 v1.0 대비 변경 사항:**
> - NestJS/Express → Next.js API Routes로 단일화
> - 토스페이먼츠 → PortOne V2로 변경
> - AWS EC2/RDS/S3 → Vercel/Neon/Vercel Blob으로 변경 (서버리스 전환)
> - Redis 제거 (코드 캐싱은 DB 직접 조회로 대체)

### 2.3 데이터베이스 스키마 (Prisma 기준 — 실제 구현 상태)

```prisma
// 관리자
model Admin {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())
}

// 셀러 (판매자)
model Seller {
  id           String       @id @default(uuid())
  email        String       @unique
  password     String
  businessNo   String       @unique    // 사업자등록번호
  name         String                   // 상호명
  repName      String                   // 대표자명
  address      String
  phone        String
  bankAccount  String?                  // 정산 계좌
  bankName     String?                  // 은행명
  tradeRegNo   String?                  // 통신판매업신고번호
  emailVerified      Boolean  @default(false)   // 이메일 인증 여부
  emailVerifyToken          String?              // 인증 토큰
  emailVerifyTokenExpiresAt DateTime?            // 토큰 만료시간 (24시간)
  status       SellerStatus @default(PENDING)    // PENDING/APPROVED/SUSPENDED
  plan         SellerPlan   @default(FREE)       // FREE/STANDARD/PRO
  createdAt    DateTime     @default(now())
}

// 상품
model Product {
  id          String   @id @default(uuid())
  sellerId    String
  name        String
  description String?
  price       Int                       // 원 단위
  stock       Int      @default(0)
  category    String
  imageUrl    String?                   // Vercel Blob URL
  isActive    Boolean  @default(true)   // soft delete 지원
  createdAt   DateTime @default(now())
}

// 주문 코드
model Code {
  id        String   @id @default(uuid())
  productId String
  codeKey   String   @unique            // 예: K9A-2503-X7YZ
  expiresAt DateTime                    // 만료 시간
  maxQty    Int      @default(0)        // 0 = 무제한
  usedQty   Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// 주문
model Order {
  id            String      @id @default(uuid())
  codeId        String
  settlementId  String?                 // 정산 연결 FK
  buyerName     String
  buyerPhone    String
  address       String
  addressDetail String?
  memo          String?
  quantity      Int         @default(1)
  amount        Int                     // 결제금액
  status        OrderStatus @default(PAID)  // PAID/SHIPPING/DELIVERED/SETTLED/REFUNDED
  pgTid         String?     @unique     // PG사 거래번호
  trackingNo    String?                 // 운송장번호
  carrier       String?                 // 택배사
  createdAt     DateTime    @default(now())
}

// 정산
model Settlement {
  id          String           @id @default(uuid())
  sellerId    String
  amount      Int              // 정산금액
  fee         Int              // 플랫폼 수수료
  pgFee       Int              // PG 수수료
  netAmount   Int              // 실지급액
  status      SettlementStatus @default(PENDING)  // PENDING/COMPLETED/FAILED
  scheduledAt DateTime         // 정산 예정일
  settledAt   DateTime?
  createdAt   DateTime         @default(now())
}

// 감사 로그
model SellerAuditLog {
  id        String   @id @default(uuid())
  sellerId  String
  action    String
  detail    Json?
  ip        String?
  createdAt DateTime @default(now())
}
```

> **기획서 v1.0 대비 스키마 변경 사항:**
> - `Admin` 모델 추가 (관리자 인증)
> - `Seller`에 `emailVerified`, `emailVerifyToken`, `emailVerifyTokenExpiresAt` 추가 (이메일 인증)
> - `Order`에 `settlementId` FK 추가 (정산 연결)
> - `Settlement`에 `scheduledAt` 추가 (정산 예정일)
> - `OrderStatus`에 `SETTLED` 추가 (정산 완료 상태)
> - status/plan 필드를 enum 타입으로 변경 (`SellerStatus`, `SellerPlan`, `OrderStatus`, `SettlementStatus`)
> - 인덱스 추가: `Order` — `[codeId, status]`, `[buyerPhone]`

---

## 3. 기능 명세

### 3.1 셀러 기능

#### 3.1.1 셀러 등록 및 인증

| 항목 | 설명 | 구현 상태 |
|------|------|-----------|
| 이메일 + 비밀번호 회원가입 | NextAuth.js v5 기반 | ✅ |
| 이메일 인증 (Resend 발송) | 토큰 기반, 24시간 만료, 재발송 기능 | ✅ |
| 사업자등록번호 입력 | 텍스트 입력 (중복 검사) | ✅ |
| 사업자등록증 이미지 업로드 | Vercel Blob 업로드 | ✅ |
| 통신판매업신고번호 입력 | 선택 입력 | ✅ |
| 정산 계좌 등록 | 은행명 + 계좌번호 | ✅ |
| 본인인증 (1원 인증) | — | ⬜ (미구현, Phase 3 이후) |
| 이용약관 + 판매자 약관 동의 | — | ⬜ (약관 페이지는 존재) |
| 운영자 수동 승인 | 관리자 셀러 목록에서 승인/거부/정지 | ✅ |
| 미인증 셀러 로그인 차단 | 이메일 미인증 시 로그인 불가 | ✅ |

#### 3.1.2 코드 발급

| 항목 | 설명 | 구현 상태 |
|------|------|-----------|
| 코드 형식 | AAA-0000-XXXX (영문3-숫자4-랜덤4) | ✅ |
| 유효기간 | 발급 시 설정 (1~72시간), 기본값: 24시간 | ✅ |
| 최대 수량 | 발급 시 설정 (0 = 무제한) | ✅ |
| 상품 연결 | 기등록 상품 1개 선택 또는 상품 등록 시 자동 발급 | ✅ |
| 코드 상태 | 활성/비활성 토글 | ✅ |
| QR코드 생성 | 코드 발급 시 QR 자동 생성, 다운로드 지원 | ✅ |
| QR 스캔 진입 | QR → `/order/[code]` 자동 코드 입력 | ✅ |
| PENDING 셀러 코드 발급 차단 | 승인 전 셀러는 코드 발급 불가 | ✅ |
| 비활성 상품 코드 발급 차단 | isActive=false 상품은 코드 발급 불가 | ✅ |
| 번들 묶음 지원 | 여러 상품 묶음 코드 | ⬜ (Phase 3 이후) |

```typescript
// 코드 생성 로직 (lib/code-generator.ts)
function generateCode(sellerId: string): string {
  const sellerHash = hashSellerId(sellerId).slice(0, 3).toUpperCase();
  const datePart = format(new Date(), 'MMdd');
  const random = randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  return `${sellerHash}-${datePart}-${random}`;
  // 예: K9A-2503-X7YZ
}
```

#### 3.1.3 셀러 대시보드

| 기능 | 구현 상태 |
|------|-----------|
| 실시간 주문 현황 (통계 카드 — 총 상품/활성 코드/총 주문/정산 대기) | ✅ |
| 최근 주문 목록 (실데이터) | ✅ |
| 7일 매출 차트 (recharts LineChart) | ✅ |
| 승인 상태 확인 버튼 (승인 시 자동 로그아웃 + 재로그인 안내) | ✅ |
| 배송지 목록 CSV 다운로드 (UTF-8 BOM, 10000건 상한) | ✅ |
| 운송장 번호 등록 UI (Dialog) | ✅ |
| 배송 추적 링크 (택배사별 URL 연결) | ✅ |
| 정산 내역 조회 (목록 + 필터 + 합계 + 상세 드릴다운) | ✅ |
| 주문 목록 상태 필터 (PAID/SHIPPING/DELIVERED/REFUNDED) | ✅ |
| 주문 목록 Skeleton 로딩 | ✅ |
| 대시보드 에러 처리 | ✅ |
| 운송장 일괄 업로드 (CSV) | ⬜ |
| 매출 통계 (주별/월별) | ⬜ |
| CS 접수 현황 및 처리 내역 | ⬜ |

### 3.2 구매자 기능

#### 3.2.1 주문 프로세스 (채팅 플로우 UI)

> **구현 참고:** 구매자 주문 프로세스는 채팅(대화형) UI로 구현됨 (`app/(buyer)/chat/page.tsx`)

| 화면/단계 | 주요 요소 | 법적 필수 요소 | 구현 상태 |
|-----------|-----------|----------------|-----------|
| 코드 입력 | 코드 입력창 (QR 스캔 지원) | — | ✅ |
| 상품 확인 | 상품명, 가격, 셀러 정보, 이미지 | 셀러 신원정보 표시 (전자상거래법 제20조) | ✅ |
| 수량 선택 | 수량 선택기 (무제한 코드 시 "(무제한)" 표시, 상한 999) | — | ✅ |
| 결제 | PortOne V2 결제창, 서버측 결제 검증 | **중개자 고지 문구 필수** | ✅ |
| 배송지 입력 | 수령인, 주소, 연락처, 배송 메모 | 개인정보 수집 동의 체크박스 | ✅ |
| 주문 완료 | 주문번호, 주문 요약 | 청약확인 고지 (전자상거래법 제13조) | ✅ |

> 🚨 **결제 화면 필수 고지 문구 (법적 의무 — 전자상거래법 제20조)**
>
> ```
> 본 플랫폼(LIVEORDER)은 통신판매중개업자로서 거래 당사자가 아닙니다.
> 상품의 품질, 적법성, 배송에 관한 책임은 판매자에게 있습니다.
> 판매자 정보: [셀러명] | 사업자번호: [000-00-00000] | 통신판매업신고: [신고번호]
> ```

#### 3.2.2 주문 조회

| 기능 | 구현 상태 |
|------|-----------|
| 비회원 조회 (전화번호 + 주문번호) | ✅ |
| 배송 상태 표시 (PAID/SHIPPING/DELIVERED) | ✅ |
| 배송 추적 링크 (택배사별 외부 사이트 연결) | ✅ |
| 청약철회 신청 (결제 후 7일 이내, PAID 상태만) | ✅ |
| 배송 상태 실시간 조회 (택배사 API 연동) | ⬜ (현재 외부 링크만) |

#### 3.2.3 청약확인 및 청약철회 (전자상거래법 대응)

| 기능 | 설명 | 구현 상태 |
|------|------|-----------|
| 청약확인 UI | 주문 완료 화면에 주문번호/상품명/수량/결제금액 고지 | ✅ |
| 청약철회 신청 API | `POST /api/orders/[id]/withdraw` — buyerPhone 인증, PAID+7일 검증 | ✅ |
| 청약철회 버튼 | 주문 조회 페이지에서 조건부 표시 | ✅ |
| 관리자 알림 | 청약철회 요청 시 관리자 이메일 알림 | ✅ |

#### 3.2.4 개인정보 처리

| 기능 | 설명 | 구현 상태 |
|------|------|-----------|
| 개인정보처리방침 페이지 | `/terms/privacy` | ✅ |
| 이용약관 페이지 | `/terms` | ✅ |
| 개인정보 삭제 요청 페이지 | `/privacy/request` — 이름+전화번호로 삭제 요청 | ✅ |
| 삭제 처리 API | `POST /api/buyer/data-deletion` — 개인정보 마스킹 ([삭제됨]) | ✅ |
| Rate Limiting | IP 기반 1시간 5회 제한 (메모리 기반) | ✅ |

### 3.3 플랫폼 운영자 기능

| 기능 | 구현 상태 |
|------|-----------|
| 관리자 로그인 (별도 인증) | ✅ |
| 관리자 대시보드 | ✅ |
| 셀러 승인/거부/정지 관리 + 감사 로그 | ✅ |
| 셀러 사업자등록증 확인 | ✅ |
| 주문 목록 조회 + 환불 UI (RefundDialog) | ✅ |
| 정산 조회 + 배치 실행 버튼 (CRON_SECRET 인증) | ✅ |
| 불법 상품 신고 접수 및 코드 즉시 비활성화 | ⬜ |
| 분쟁 조정 시스템 | ⬜ |
| 이상 거래 모니터링 알림 | ⬜ |

---

## 4. 코드 시스템 상세 설계

### 4.1 코드 생성 알고리즘

```
코드 형식: [셀러식별자3자리]-[날짜4자리]-[랜덤4자리]
예시: K9A-2503-X7YZ

생성 로직:
  - 셀러 ID 해싱 → 앞 3자리 (영문 대문자)
  - 발급 월일 (MMDD)
  - CryptoRandom 4자리 (영문+숫자)

중복 방지: DB unique 제약 조건 (codeKey)
입력 편의: 대소문자 무관 처리 (자동 대문자 변환)
```

> **v1.0 대비 변경:** Redis TTL 기반 관리 → DB unique 제약 + 직접 조회로 변경

### 4.2 코드 유효성 검증 로직

```typescript
async function validateCode(codeKey: string): Promise<ValidationResult> {
  const code = await db.codes.findUnique({ where: { code_key: codeKey.toUpperCase() } });

  if (!code)            return { valid: false, reason: '존재하지 않는 코드입니다.' };
  if (!code.is_active)  return { valid: false, reason: '일시 중단된 코드입니다.' };
  if (code.expires_at < new Date()) return { valid: false, reason: '만료된 코드입니다.' };
  if (code.max_qty > 0 && code.used_qty >= code.max_qty)
                        return { valid: false, reason: '품절되었습니다.' };

  const seller = await db.sellers.findUnique({ where: { id: code.product.seller_id } });
  if (seller.status !== 'approved') return { valid: false, reason: '판매 중단된 상품입니다.' };

  return { valid: true, code };
}
```

| 검증 항목 | 통과 조건 | 실패 시 처리 | 구현 상태 |
|-----------|-----------|--------------|-----------|
| 코드 존재 여부 | DB에 등록된 코드 | "존재하지 않는 코드" 안내 | ✅ |
| 유효기간 | 현재 시각 < expires_at | "만료된 코드" 안내 | ✅ |
| 수량 제한 | used_qty < max_qty | "품절" 안내 | ✅ |
| 코드 상태 | is_active = true | "일시 중단" 안내 | ✅ |
| 셀러 상태 | seller.status = APPROVED | "판매 중단" 안내 | ✅ |

---

## 5. 결제 및 정산 구조

### 5.1 결제 구조 (법적 적합 설계)

> ✅ **핵심 원칙: 플랫폼이 결제대금을 직접 수령하지 않는다**
>
> ```
> 구매자 → PG사(PortOne V2) → 셀러 정산계좌
>                ↑
>          플랫폼 수수료 차감 후 지급
> ```

| 항목 | 설명 | 구현 상태 |
|------|------|-----------|
| PortOne V2 결제창 호출 | 클라이언트 SDK | ✅ |
| 서버측 결제 검증 | `/api/payments/confirm` | ✅ |
| pgTid 중복 주문 방지 | unique 제약 + 서버 검증 | ✅ |
| 레이스 컨디션 방지 | 원자적 UPDATE (usedQty) | ✅ |
| 결제 완료 시 셀러 이메일 알림 | Resend 발송 | ✅ |

### 5.2 정산 프로세스

| 단계 | 시점 | 내용 | 구현 상태 |
|------|------|------|-----------|
| 결제 완료 | 실시간 | PG사에 결제대금 보관, 플랫폼에 결제 완료 처리 | ✅ |
| 배송 확인 | 운송장 등록 후 | PAID → SHIPPING → DELIVERED 상태 전환 | ✅ |
| 정산 배치 | D+3 크론 | DELIVERED 주문 대상 정산 생성 (CRON_SECRET 인증) | ✅ |
| 수수료 차감 | 정산 처리 시 | 플랫폼 수수료 + PG사 수수료 차감 | ✅ |
| 셀러 입금 | 정산 완료 시 | settlementId FK로 주문-정산 연결 | ✅ |
| 정산 내역 발송 | 정산 생성 후 | 셀러 이메일 알림 | ✅ |
| 관리자 환불 처리 | 수동 | PortOne API 연동 환불 (RefundDialog) | ✅ |
| 부분환불 상태 처리 | — | 환불 후 주문 상태 REFUNDED 변경 | ✅ |

### 5.3 수수료 구조 (초안)

| 항목 | 비율/금액 | 비고 |
|------|-----------|------|
| 플랫폼 중개 수수료 | 거래금액의 2.5% | 기본 플랜 기준 |
| PG사 결제 수수료 | 약 1.2~1.8% | PG사별 협의 |
| 셀러 월정액 (선택) | 0원 / 29,000원 / 99,000원 | 무료/스탠다드/프로 플랜 |
| 코드 발급 수수료 | 무료 (기본) | 대량 발급 시 플랜 적용 |

---

## 6. 이메일 알림 시스템

> **기획서 v1.0에 미포함 — 코드 기반 추가 문서화**

| 발송 시점 | 수신자 | 내용 | 구현 상태 |
|-----------|--------|------|-----------|
| 셀러 회원가입 시 | 관리자 | 신규 셀러 승인 요청 알림 | ✅ |
| 셀러 회원가입 시 | 셀러 | 이메일 인증 링크 (24시간 만료) | ✅ |
| 셀러 승인 시 | 셀러 | 승인 완료 알림 | ✅ |
| 주문 생성 시 | 셀러 | 새 주문 접수 알림 | ✅ |
| 정산 생성 시 | 셀러 | 정산 완료 알림 | ✅ |
| 청약철회 요청 시 | 관리자 | 청약철회 요청 접수 알림 | ✅ |
| 이메일 인증 재발송 | 셀러 | 인증 링크 재발송 | ✅ |

라이브러리: **Resend** (`lib/email.ts`)

---

## 7. 리스크 관리 설계

### 7.1 불법 상품 방지 체계

| 단계 | 방법 | 책임 | 구현 상태 |
|------|------|------|-----------|
| 셀러 등록 시 | 사업자등록번호 검증 + 이메일 인증 | 플랫폼 (필수) | ✅ |
| 셀러 등록 시 | 사업자등록증 이미지 첨부 | 플랫폼 (필수) | ✅ |
| 셀러 등록 시 | 통신판매업신고번호 입력 | 셀러 (선택) | ✅ |
| 상품 등록 시 | 카테고리별 금지 목록 자동 필터 | 셀러 (자기책임) | ⬜ |
| 코드 발급 시 | 고위험 카테고리 인허가번호 필수 입력 | 셀러 (필수입력) | ⬜ |
| 거래 중 | 이상거래 모니터링 | 플랫폼 (자동) | ⬜ |
| 신고 접수 시 | 24시간 내 코드 비활성화 → 조사 → 처리 | 플랫폼 (의무) | ⬜ |

### 7.2 금지 상품 카테고리

**절대 금지 (하드블록)**
- 의약품, 마약류, 향정신성의약품
- 총포, 도검, 화약류
- 위조품, 불법 복제품
- 음란물, 미허가 성인용품
- 개인정보, 계정 정보

**조건부 허용 (인허가 서류 필수)**
- 식품 → 식품영업허가증
- 건강기능식품 → 기능성인정서
- 화장품 → 화장품제조업 등록증
- 의료기기 → 의료기기 허가증
- 주류 → 통신판매 신고 확인

### 7.3 보안 조치 (구현 완료)

| 항목 | 설명 | 구현 상태 |
|------|------|-----------|
| debug 엔드포인트 제거 | 프로덕션 보안 | ✅ |
| 결제 우회 엔드포인트 제거 | 결제 무결성 | ✅ |
| 서버측 전화번호 형식 검증 | 입력 검증 | ✅ |
| 미들웨어 HKDF JWE 복호화 | 인증 보안 | ✅ |
| PENDING 셀러 기능 차단 | 권한 관리 | ✅ |
| 개인정보 삭제 Rate Limiting | 악용 방지 | ✅ |
| pgTid 중복 주문 방지 | 결제 무결성 | ✅ |

---

## 8. 개인정보 처리 설계

### 8.1 수집 개인정보 항목

| 수집 대상 | 항목 | 보유 기간 | 목적 |
|-----------|------|-----------|------|
| 구매자 | 이름, 연락처, 배송주소 | 거래 후 5년 | 배송 처리, 분쟁 해결 |
| 구매자 | 결제 정보 (카드번호 제외) | 5년 | 거래 기록 (전자상거래법) |
| 셀러 | 사업자 정보, 계좌, 연락처 | 계약 종료 후 5년 | 정산, 계약 |
| 공통 | 접속 IP, 이용 로그 | 3년 | 보안, 이상거래 탐지 |

### 8.2 개인정보 제3자 제공

> ⚠️ **결제 화면에서 반드시 별도 동의를 받아야 함** → ✅ 구현 완료 (개인정보 수집 동의 체크박스)
>
> - 제공 대상: 셀러 (배송 처리 목적)
> - 제공 항목: 수령인명, 배송주소, 연락처, 주문 상품명
> - 제공 시점: 결제 완료 직후 셀러 대시보드에 표시
> - 동의 거부 시: 배송 처리 불가 (구매 진행 불가)

### 8.3 개인정보 삭제권 (개인정보보호법 대응) — ✅ 구현 완료

- 삭제 요청 페이지: `/privacy/request`
- 처리 방식: 개인정보 마스킹 (이름/전화번호/주소 → "[삭제됨]")
- 거래 기록 보존: 주문번호, 결제금액은 전자상거래법에 따라 5년간 보존
- 보호 조치: IP 기반 Rate Limiting (1시간 5회)

---

## 9. 개발 로드맵 및 구현 현황

### Phase 1 — MVP ✅ 완료

| 기능 | 우선순위 | 구현 상태 |
|------|----------|-----------|
| 셀러 회원가입 + 이메일 인증 | P0 | ✅ |
| 관리자 로그인 + 셀러 승인 | P0 | ✅ |
| 상품 등록/수정/삭제 + 이미지 업로드 | P0 | ✅ |
| 코드 발급 + QR코드 생성 | P0 | ✅ |
| 구매자 코드 입력 + 상품 확인 (채팅 UI) | P0 | ✅ |
| PG사 결제 연동 (PortOne V2) + 서버 검증 | P0 | ✅ |
| 배송지 입력 + 개인정보 동의 + 주문 완료 | P0 | ✅ |
| 셀러 주문 목록 + CSV 다운로드 | P0 | ✅ |
| 운송장 등록 + 배송 상태 전환 | P0 | ✅ |
| 셀러 대시보드 (통계 + 최근 주문) | P0 | ✅ |
| 이용약관 + 개인정보처리방침 페이지 | P0 | ✅ |
| 미들웨어 인증 (HKDF JWE 복호화) | P0 | ✅ |
| 보안 버그 수정 (debug 제거, 레이스 컨디션 등) | P0 | ✅ |

### Phase 2 — 고도화 ✅ 완료

| 기능 | 구현 상태 |
|------|-----------|
| 정산 크론 배치 시스템 (D+3) | ✅ |
| 셀러 정산 페이지 (목록 + 필터 + 합계 + 상세 드릴다운) | ✅ |
| 관리자 주문 목록 + 환불 UI | ✅ |
| 관리자 정산 조회 + 배치 실행 버튼 | ✅ |
| API 페이지네이션 (셀러/관리자 목록 4개) | ✅ |
| 이메일 알림 (Resend — 회원가입/승인/주문/정산) | ✅ |
| 상품 등록 시 코드 자동 발급 (UX-1) | ✅ |
| 코드 QR코드 생성 + 다운로드 (UX-2) | ✅ |
| 셀러 대시보드 7일 매출 차트 (recharts) | ✅ |
| 배송 추적 링크 (택배사별 URL) | ✅ |

### Phase 3 — 확장 (진행 중)

| 기능 | 구현 상태 |
|------|-----------|
| 기술 부채 클린업 (SettlementDrawer 에러처리, 타입 안전성 등) | ✅ |
| 셀러 이메일 인증 (토큰 기반, 24시간 만료) | ✅ |
| 이메일 인증 토큰 만료 검증 | ✅ |
| 구매자 개인정보 삭제 요청 | ✅ |
| 청약확인 UI + 청약철회 신청 (전자상거래법) | ✅ |
| 주문 상태 필터 (셀러 주문 목록) | ✅ |
| QuantitySelector 무제한 코드 UX 개선 | ✅ |
| CSV export 10000건 상한 | ✅ |
| 셀러 주문 목록 Skeleton 로딩 + 에러 처리 | ✅ |
| data-deletion Rate Limiting | ✅ |
| 미인증 셀러 로그인 차단 | ✅ |
| 사업자등록증 이미지 업로드 (Task 34) | ✅ |
| 택배사 API 연동 (실시간 배송 추적) | ⬜ |
| 셀러 매출 분석 대시보드 (주별/월별) | ⬜ |
| 구매자 주문 이력 (선택적 회원가입) | ⬜ |
| 불법 상품 AI 키워드 필터 | ⬜ |
| CS 티켓 관리 시스템 | ⬜ |

### Phase 4 — 장기 (미착수)

| 기능 | 구현 상태 |
|------|-----------|
| 라이브 플랫폼 댓글 자동 감지 연동 | ⬜ |
| 구매자 모바일 앱 (iOS/Android) | ⬜ |
| 셀러 플랜 구독 시스템 | ⬜ |
| 번들 코드 (여러 상품 묶음) | ⬜ |
| 해외 배송 지원 | ⬜ |

---

## 10. API 명세 (현재 구현 상태)

### 10.1 공개 API (인증 없음)

| Method | Endpoint | 설명 | 구현 상태 |
|--------|----------|------|-----------|
| POST | /api/sellers/register | 셀러 회원가입 | ✅ |
| GET | /api/codes/[code] | 코드 유효성 검증 | ✅ |
| POST | /api/payments/confirm | 결제 확인 (PortOne 검증) | ✅ |
| GET | /api/orders/[id] | 주문 조회 (전화번호 인증) | ✅ |
| POST | /api/orders/[id]/withdraw | 청약철회 신청 | ✅ |
| POST | /api/buyer/data-deletion | 개인정보 삭제 요청 | ✅ |

### 10.2 셀러 API (NextAuth 세션 인증)

| Method | Endpoint | 설명 | 구현 상태 |
|--------|----------|------|-----------|
| GET | /api/seller/me | 내 정보 조회 | ✅ |
| GET | /api/seller/dashboard | 대시보드 통계 | ✅ |
| POST | /api/seller/products | 상품 등록 | ✅ |
| GET | /api/seller/products | 내 상품 목록 | ✅ |
| PUT | /api/seller/products/[id] | 상품 수정 | ✅ |
| DELETE | /api/seller/products/[id] | 상품 삭제 (soft delete) | ✅ |
| POST | /api/seller/products/upload | 상품 이미지 업로드 | ✅ |
| POST | /api/seller/codes | 코드 발급 | ✅ |
| GET | /api/seller/codes | 코드 목록 | ✅ |
| PUT | /api/seller/codes/[id]/toggle | 코드 활성화/비활성화 | ✅ |
| GET | /api/seller/orders | 주문 목록 (페이지네이션 + 상태 필터) | ✅ |
| GET | /api/seller/orders/export | 배송지 CSV 다운로드 | ✅ |
| POST | /api/seller/orders/[id]/tracking | 운송장 등록 | ✅ |
| GET | /api/seller/settlements | 정산 내역 | ✅ |
| GET | /api/seller/settlements/[id] | 정산 상세 | ✅ |
| POST | /api/seller/auth/verify | 이메일 인증 확인 | ✅ |
| POST | /api/seller/auth/verify/resend | 이메일 인증 재발송 | ✅ |

### 10.3 관리자 API (관리자 세션 인증)

| Method | Endpoint | 설명 | 구현 상태 |
|--------|----------|------|-----------|
| GET | /api/admin/dashboard | 관리자 대시보드 | ✅ |
| GET | /api/admin/sellers | 셀러 목록 | ✅ |
| PUT | /api/admin/sellers/[id] | 셀러 상태 변경 (승인/거부/정지) | ✅ |
| GET | /api/admin/orders | 주문 목록 | ✅ |
| POST | /api/admin/orders/[id]/refund | 환불 처리 | ✅ |
| GET | /api/admin/settlements | 정산 목록 | ✅ |

### 10.4 시스템 API

| Method | Endpoint | 설명 | 구현 상태 |
|--------|----------|------|-----------|
| POST | /api/cron/settlements | 정산 배치 (CRON_SECRET Bearer 인증) | ✅ |

### 10.5 인증 API (NextAuth)

| Method | Endpoint | 설명 | 구현 상태 |
|--------|----------|------|-----------|
| * | /api/auth/[...nextauth] | NextAuth.js v5 핸들러 | ✅ |

### 10.6 카카오 챗봇 API (Phase 4 — v3)

| Method | Endpoint | 설명 | 구현 상태 |
|--------|----------|------|-----------|
| POST | /api/kakao/webhook | 오픈빌더 스킬 서버 — 코드 검증 + commerceCard 응답 | 🔧 Task 36 |
| GET | /api/kakao/session/[token] | 결제 세션 토큰 검증 + 코드/상품 정보 반환 | 🔧 Task 36 |

### 10.7 셀러 파일 업로드 API

| Method | Endpoint | 설명 | 구현 상태 |
|--------|----------|------|-----------|
| POST | /api/seller/biz-reg-upload | 사업자등록증 이미지 업로드 (Vercel Blob) | ✅ |

---

## 11. 환경 변수 목록 (실제 사용 중)

```env
# Database (Neon Serverless PostgreSQL)
DATABASE_URL=postgresql://...@....neon.tech/liveorder?sslmode=require

# Auth (NextAuth.js v5)
NEXTAUTH_SECRET=...          # JWT 서명 키 (32자 이상)
NEXTAUTH_URL=...             # 프로덕션 URL

# PG사 (PortOne V2)
PORTONE_API_KEY=...          # PortOne API 키
PORTONE_STORE_ID=...         # PortOne 상점 ID
PORTONE_API_SECRET=...       # PortOne 환불 API 인증 시크릿
NEXT_PUBLIC_PORTONE_STORE_ID=...       # 클라이언트 결제창 호출
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=...    # 클라이언트 채널 키

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=...    # Vercel Blob 토큰

# Email (Resend)
RESEND_API_KEY=...           # 이메일 알림

# Cron
CRON_SECRET=...              # 정산 크론 Bearer 토큰

# Optional
ADMIN_EMAIL=...              # 관리자 알림 수신 이메일 (미설정 시 admin@liveorder.app)
```

> **v1.0 대비 변경:** Redis, AWS S3/EC2/RDS 환경 변수 제거. Vercel Blob, Resend, PortOne, CRON_SECRET 추가.

---

## 12. 폴더 구조 (실제 구현)

```
liveorder/
├── app/
│   ├── (buyer)/              # 구매자 페이지
│   │   ├── page.tsx          # 코드 입력 메인
│   │   ├── chat/page.tsx     # 채팅형 주문 플로우
│   │   ├── order/[code]/     # 상품 확인 (QR 스캔 진입)
│   │   ├── kakao/[token]/    # 카카오 챗봇 결제 진입 (v3) 🔧
│   │   ├── lookup/page.tsx   # 주문 조회 + 청약철회
│   │   ├── terms/page.tsx    # 이용약관
│   │   ├── terms/privacy/    # 개인정보처리방침
│   │   ├── privacy/page.tsx  # 개인정보 안내
│   │   └── privacy/request/  # 개인정보 삭제 요청
│   ├── seller/               # 셀러 대시보드
│   │   ├── auth/login/       # 셀러 로그인
│   │   ├── auth/register/    # 셀러 회원가입
│   │   ├── auth/verify/      # 이메일 인증
│   │   ├── dashboard/        # 대시보드 (통계 + 차트)
│   │   ├── products/         # 상품 관리 (목록/등록/수정)
│   │   ├── codes/            # 코드 관리 (목록/발급)
│   │   ├── orders/           # 주문 관리
│   │   └── settlements/      # 정산 내역
│   ├── admin/                # 운영자 관리
│   │   ├── auth/login/       # 관리자 로그인
│   │   ├── dashboard/        # 관리자 대시보드
│   │   ├── sellers/          # 셀러 관리 (승인/거부/정지)
│   │   ├── orders/           # 주문 관리 + 환불
│   │   └── settlements/      # 정산 관리
│   └── api/
│       ├── kakao/            # 카카오 챗봇 API (v3) 🔧
│       │   ├── webhook/      # 오픈빌더 스킬 서버
│       │   └── session/[token]/ # 세션 토큰 검증
│       └── ...               # 기타 API Routes (10장 참조)
├── components/
│   ├── admin/                # 관리자 컴포넌트 (RefundDialog 등)
│   ├── buyer/                # 구매자 컴포넌트 (QuantitySelector 등)
│   ├── seller/               # 셀러 컴포넌트 (SettlementDetailDrawer 등)
│   └── ui/                   # shadcn/ui 공통 컴포넌트
├── lib/
│   ├── auth.ts               # NextAuth 설정
│   ├── carrier-urls.ts       # 택배사 배송 추적 URL 매핑
│   ├── code-generator.ts     # 코드 생성 로직
│   ├── db.ts                 # Prisma 클라이언트 (Neon 어댑터)
│   ├── email.ts              # Resend 이메일 발송
│   ├── pagination.ts         # 페이지네이션 유틸리티
│   ├── portone.ts            # PortOne 결제 연동
│   └── utils.ts              # 공통 유틸리티
├── prisma/
│   └── schema.prisma         # DB 스키마
├── liveorder-team/           # 팀 작업 관리 문서
│   ├── PLAN.md               # 개발 계획서
│   ├── TASKS.md              # 태스크 상세 (현재 Task 34~36 진행 중)
│   └── kakao.ts              # 카카오 채널 메시지 유틸 (Phase 4)
└── Requirements/
    └── LIVEORDER_기획서_ClaudeCode용.md  # 본 문서
```

---

## 13. 배포 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| 코드 구현 | ✅ Phase 1+2 완료, Phase 3 진행 중 | Task 34 미구현, Task 35~36 예정 |
| Vercel 배포 | 🔧 환경변수 설정 확인 중 (Task 14) | 수동 배포 |
| 도메인 설정 | ⬜ | liveorder.kr 예정 |
| 프로덕션 DB | ✅ Neon Serverless PostgreSQL | |
| 프로덕션 PG | 🔧 PortOne 테스트 키 → 실결제 키 전환 필요 | |

---

## 14. Phase 4: 카카오톡 챗봇 주문 시스템 (2026-04-09~)

### 14.1 배경 및 목적

LiveOrder v3 재가동. 기존 웹 기반 주문 플로우(liveorder.kr 접속 → 코드 입력)에 더해, **카카오톡 채널을 통한 주문 플로우**를 추가하여 구매자 진입 장벽을 최소화한다.

### 14.2 서비스 플로우

```
[셀러] 기존과 동일: 상품 등록 + 코드 발급
         ↓
[셀러] 라이브 방송 중 코드 + 카카오톡 채널 링크 공지
         ↓
[구매자] 카카오톡 채널 친구 추가 → 코드 입력 (예: ABC-1234-XY01)
         ↓
[챗봇] 코드 유효성 검증 → 상품 정보 카드 + "결제하기" 버튼 전송
         ↓
[구매자] "결제하기" 클릭 → liveorder.kr/kakao/[세션토큰] 접속
         ↓
[시스템] 세션 토큰 검증 (30분 만료) → 수량 선택 → PortOne 결제
         ↓
[구매자] 결제 완료 → 배송지 입력 → 주문 확정
         ↓
[챗봇] 주문 완료 알림 메시지 (선택 구현)
```

### 14.3 기술 스택 추가

| 항목 | 기술 | 비고 |
|------|------|------|
| 카카오 채널 메시지 | 카카오 비즈메시지 API | 액세스 토큰 필요 |
| 웹훅 수신 | Next.js Route Handler | POST /api/kakao/webhook |
| 결제 세션 | KakaoPaySession (Prisma) | 30분 만료 토큰 |
| 환경변수 | KAKAO_CHANNEL_ID, KAKAO_REST_API_KEY, KAKAO_BIZMSG_ACCESS_TOKEN | |

### 14.4 신규 구현 파일

| 파일 | 내용 | 상태 |
|------|------|------|
| `lib/kakao.ts` | 카카오 메시지 발송 유틸 + 상품 카드 빌더 | ✅ |
| `prisma` 마이그레이션 | `kakao_pay_sessions` 테이블 추가 | ✅ |
| `app/api/kakao/webhook/route.ts` | 챗봇 웹훅 수신 + 코드 검증 + commerceCard 응답 | 🔧 Task 36 |
| `app/api/kakao/session/[token]/route.ts` | 세션 토큰 검증 API | 🔧 Task 36 |
| `app/(buyer)/kakao/[token]/page.tsx` | 카카오 결제 진입 페이지 (토큰 검증 → /chat redirect) | 🔧 Task 36 |

### 14.5 카드 메시지 스펙 (basicCard)

```json
{
  "object_type": "commerce",
  "content": {
    "title": "상품명",
    "description": "₩가격 | 재고: N개",
    "image_url": "상품 이미지 URL",
    "link": { "web_url": "https://liveorder.kr/kakao/[토큰]" }
  },
  "commerce": { "regular_price": 가격 },
  "buttons": [
    { "title": "결제하기", "link": { "web_url": "https://liveorder.kr/kakao/[토큰]" } }
  ]
}
```

### 14.6 보안 고려사항

- 웹훅 수신 시 카카오 서명 검증 (X-Kakao-Signature 헤더)
- KakaoPaySession 토큰: nanoid(32), 30분 만료, 1회 사용 후 폐기 검토
- 결제 완료 시 기존 pgTid unique 제약으로 중복 결제 방지

---

*본 문서는 Claude Code 개발 지시 및 플랫폼 설계 기준 문서입니다.*
*법적 사항은 변호사 검토 후 적용하시기 바랍니다.*
*최종 업데이트: 2026-04-09*
