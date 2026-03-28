# LIVEORDER — 라이브커머스 주문·결제 플랫폼
## Claude Code 개발 기획서 v1.0
> 작성일: 2026년 3월 | 플랫폼 포지션: 통신판매중개업자

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
> - 결제는 **외부 PG사(토스페이먼츠/이니시스 등) 지급대행 서비스** 활용
> - 플랫폼은 주문 접수 + 결제 중개 + 배송정보 전달 + 정산 역할
> - 상품의 품질·적법성 책임은 **셀러에게 귀속** (약관으로 명시)

---

## 2. 전체 시스템 아키텍처

### 2.1 서비스 플로우

```
[셀러] 상품 등록 + 코드 발급
        ↓
[셀러] 라이브 방송 중 코드 공지 (유튜브/틱톡 — 플랫폼 관여 없음)
        ↓
[구매자] liveorder.kr 접속 → 코드 입력
        ↓
[시스템] 코드 유효성 검증 → 상품 정보 + 셀러 정보 표시
        ↓
[구매자] 수량 선택 → PG사 결제창 → 결제 완료
        ↓
[구매자] 배송지 입력 → 주문 확정
        ↓
[셀러] 대시보드 주문 확인 → 배송지 엑셀 다운로드 → 발송
        ↓
[시스템] 배송 완료 확인 → D+3 자동 정산 (PG 지급대행)
```

| 단계 | 행위자 | 액션 | 시스템 처리 |
|------|--------|------|-------------|
| 1 | 셀러 | 상품 등록 + 코드 발급 요청 | 코드 생성 (형식: AAA-0000-XXXX), 유효기간·수량 설정 |
| 2 | 셀러 | 라이브 방송 중 코드 공지 | 외부 시스템 — 플랫폼 관여 없음 |
| 3 | 구매자 | 플랫폼 접속 + 코드 입력 | 코드 유효성 검증, 상품 정보 표시 |
| 4 | 구매자 | 수량 선택 + 결제 진행 | PG사 결제창 호출, 결제 완료 처리 |
| 5 | 구매자 | 배송지 입력 + 주문 확인 | 주문 DB 저장, 셀러 알림 발송 |
| 6 | 셀러 | 주문 목록 확인 + 배송 처리 | 배송지 엑셀 다운로드, 운송장 업로드 |
| 7 | 플랫폼 | 배송 완료 확인 후 정산 | PG 지급대행으로 셀러 계좌 자동 입금 |

### 2.2 기술 스택 (권장)

**Frontend**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- React Query (서버 상태 관리)
- Zustand (클라이언트 상태)

**Backend**
- Node.js + NestJS (또는 Express)
- PostgreSQL (주문/정산 데이터)
- Redis (코드 유효성 캐싱)
- AWS S3 (이미지 스토리지)
- 토스페이먼츠 SDK (PG 연동)

**Infra**
- AWS EC2 / ECS (컨테이너)
- AWS RDS (PostgreSQL)
- ElastiCache (Redis)
- CloudFront + S3 (정적 파일)

### 2.3 데이터베이스 스키마 (핵심 테이블)

```sql
-- 셀러 테이블
CREATE TABLE sellers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_no   VARCHAR(12) UNIQUE NOT NULL,  -- 사업자등록번호
  name          VARCHAR(100) NOT NULL,
  rep_name      VARCHAR(50) NOT NULL,          -- 대표자명
  address       TEXT NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  bank_account  VARCHAR(30),
  bank_name     VARCHAR(20),
  trade_reg_no  VARCHAR(50),                  -- 통신판매업신고번호
  status        VARCHAR(20) DEFAULT 'pending', -- pending/approved/suspended
  plan          VARCHAR(20) DEFAULT 'free',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 상품 테이블
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID REFERENCES sellers(id),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,               -- 원 단위
  stock       INTEGER DEFAULT 0,
  category    VARCHAR(50) NOT NULL,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 코드 테이블
CREATE TABLE codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id),
  code_key    VARCHAR(20) UNIQUE NOT NULL,    -- 예: K9A-2503-X7YZ
  expires_at  TIMESTAMPTZ NOT NULL,
  max_qty     INTEGER DEFAULT 0,              -- 0 = 무제한
  used_qty    INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 주문 테이블
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id         UUID REFERENCES codes(id),
  buyer_name      VARCHAR(50) NOT NULL,
  buyer_phone     VARCHAR(20) NOT NULL,
  address         TEXT NOT NULL,
  address_detail  TEXT,
  memo            TEXT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  amount          INTEGER NOT NULL,           -- 결제금액
  status          VARCHAR(20) DEFAULT 'paid', -- paid/shipping/delivered/refunded
  pg_tid          VARCHAR(100),               -- PG사 거래번호
  tracking_no     VARCHAR(50),               -- 운송장번호
  carrier         VARCHAR(30),               -- 택배사
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 정산 테이블
CREATE TABLE settlements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID REFERENCES sellers(id),
  amount        INTEGER NOT NULL,             -- 정산금액
  fee           INTEGER NOT NULL,             -- 수수료
  pg_fee        INTEGER NOT NULL,             -- PG수수료
  net_amount    INTEGER NOT NULL,             -- 실지급액
  status        VARCHAR(20) DEFAULT 'pending',
  settled_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 감사 로그
CREATE TABLE seller_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID REFERENCES sellers(id),
  action      VARCHAR(100) NOT NULL,
  detail      JSONB,
  ip          INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. 기능 명세

### 3.1 셀러 기능

#### 3.1.1 셀러 등록 및 인증

1. 사업자등록증 이미지 업로드 (필수)
2. 통신판매업신고 번호 입력 (필수)
3. 정산 계좌 등록 및 본인인증 (1원 인증)
4. 이용약관 + 판매자 약관 전자서명 동의
5. 운영자 수동 승인 (최초 1회, 이후 자동)

#### 3.1.2 코드 발급

| 항목 | 설명 | 비고 |
|------|------|------|
| 코드 형식 | AAA-0000-XXXX (영문3-숫자4-랜덤4) | 대소문자 구분 없음 |
| 유효기간 | 발급 시 설정 (1~72시간) | 기본값: 24시간 |
| 최대 수량 | 발급 시 설정 (0 = 무제한) | 재고 자동 연동 가능 |
| 상품 연결 | 기등록 상품 1개 선택 또는 즉시 등록 | 번들 묶음 지원 |
| 코드 상태 | 활성 / 일시정지 / 만료 / 소진 | 셀러가 즉시 제어 가능 |

```typescript
// 코드 생성 로직
function generateCode(sellerId: string): string {
  const sellerHash = hashSellerId(sellerId).slice(0, 3).toUpperCase();
  const datePart = format(new Date(), 'MMdd');
  const random = randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  return `${sellerHash}-${datePart}-${random}`;
  // 예: K9A-2503-X7YZ
}
```

#### 3.1.3 셀러 대시보드

- 실시간 주문 현황 (코드별, 상품별)
- 배송지 목록 엑셀 다운로드
- 운송장 번호 일괄 업로드 (CSV)
- 정산 내역 및 예정 정산 금액 조회
- 매출 통계 (일별/주별/월별 차트)
- CS 접수 현황 및 처리 내역

### 3.2 구매자 기능

#### 3.2.1 주문 프로세스 (화면별)

| 화면 | 주요 요소 | 법적 필수 요소 |
|------|-----------|----------------|
| 코드 입력 | 코드 입력창, 방송 링크 안내 | — |
| 상품 확인 | 상품명, 가격, 셀러 정보 | 셀러 신원정보 표시 (전자상거래법 제20조) |
| 결제 | 수량 선택, PG사 결제창 | **중개자 고지 문구 필수** |
| 배송지 입력 | 수령인, 주소, 연락처, 배송 메모 | 개인정보 수집 동의 |
| 주문 완료 | 주문번호, 배송 조회 방법 | 청약확인 발송 의무 |

> 🚨 **결제 화면 필수 고지 문구 (법적 의무 — 전자상거래법 제20조)**
>
> ```
> 본 플랫폼(LIVEORDER)은 통신판매중개업자로서 거래 당사자가 아닙니다.
> 상품의 품질, 적법성, 배송에 관한 책임은 판매자에게 있습니다.
> 판매자 정보: [셀러명] | 사업자번호: [000-00-00000] | 통신판매업신고: [신고번호]
> ```

#### 3.2.2 주문 조회

- 비회원: 휴대폰 번호 + 주문번호로 조회
- 배송 상태 실시간 조회 (택배사 API 연동)
- 청약철회 신청 버튼 (결제 후 7일 이내)

### 3.3 플랫폼 운영자 기능

- 셀러 승인/거부/정지 관리
- 불법 상품 신고 접수 및 코드 즉시 비활성화
- 분쟁 조정 및 환불 처리
- 정산 배치 처리 (D+3 기본)
- 이상 거래 모니터링 알림

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

중복 방지: Redis TTL로 활성 코드 관리
입력 편의: 대소문자 무관 처리 (자동 대문자 변환)
```

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

| 검증 항목 | 통과 조건 | 실패 시 처리 |
|-----------|-----------|--------------|
| 코드 존재 여부 | DB에 등록된 코드 | "존재하지 않는 코드" 안내 |
| 유효기간 | 현재 시각 < expires_at | "만료된 코드" 안내 |
| 수량 제한 | used_qty < max_qty | "품절" 안내 |
| 코드 상태 | is_active = true | "일시 중단" 안내 |
| 셀러 상태 | seller.status = approved | "판매 중단" 안내 |

---

## 5. 결제 및 정산 구조

### 5.1 결제 구조 (법적 적합 설계)

> ✅ **핵심 원칙: 플랫폼이 결제대금을 직접 수령하지 않는다**
>
> ```
> 구매자 → PG사(토스페이먼츠) → 셀러 정산계좌
>                ↑
>          플랫폼 수수료 차감 후 지급 (PG 지급대행)
> ```
>
> 이 구조면 전자금융거래법상 PG업 미등록 상태에서 합법 운영 가능

### 5.2 정산 프로세스

| 단계 | 시점 | 내용 |
|------|------|------|
| 결제 완료 | 실시간 | PG사에 결제대금 보관, 플랫폼에 결제 완료 웹훅 |
| 배송 확인 | 운송장 등록 후 N일 | 배송 완료 또는 일정 기간 경과 후 정산 개시 |
| 수수료 차감 | 정산 처리 시 | 거래금액의 X% 플랫폼 수수료 + PG사 수수료 |
| 셀러 입금 | D+3 영업일 | PG 지급대행으로 셀러 등록 계좌 자동 입금 |
| 정산 내역 발송 | 입금 익일 | 셀러 이메일 + 대시보드 정산내역서 발행 |

### 5.3 수수료 구조 (초안)

| 항목 | 비율/금액 | 비고 |
|------|-----------|------|
| 플랫폼 중개 수수료 | 거래금액의 2.5% | 기본 플랜 기준 |
| PG사 결제 수수료 | 약 1.2~1.8% | PG사별 협의 |
| 셀러 월정액 (선택) | 0원 / 29,000원 / 99,000원 | 무료/스탠다드/프로 플랜 |
| 코드 발급 수수료 | 무료 (기본) | 대량 발급 시 플랜 적용 |

---

## 6. 리스크 관리 설계

### 6.1 불법 상품 방지 체계

| 단계 | 방법 | 책임 |
|------|------|------|
| 셀러 등록 시 | 사업자등록증 + 통신판매업신고번호 검증 | 플랫폼 (필수) |
| 상품 등록 시 | 카테고리별 금지 목록 자동 필터 + 셀러 적법성 자기확인 체크박스 | 셀러 (자기책임) |
| 코드 발급 시 | 고위험 카테고리(식품/건강기능식품/화장품) → 인허가번호 필수 입력 | 셀러 (필수입력) |
| 거래 중 | 이상거래 모니터링 (동일IP 다수 주문, 단시간 고액거래) | 플랫폼 (자동) |
| 신고 접수 시 | 24시간 내 코드 비활성화 → 조사 → 처리 | 플랫폼 (의무) |

### 6.2 금지 상품 카테고리

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

---

## 7. 개인정보 처리 설계

### 7.1 수집 개인정보 항목

| 수집 대상 | 항목 | 보유 기간 | 목적 |
|-----------|------|-----------|------|
| 구매자 | 이름, 연락처, 배송주소 | 거래 후 5년 | 배송 처리, 분쟁 해결 |
| 구매자 | 결제 정보 (카드번호 제외) | 5년 | 거래 기록 (전자상거래법) |
| 셀러 | 사업자 정보, 계좌, 연락처 | 계약 종료 후 5년 | 정산, 계약 |
| 공통 | 접속 IP, 이용 로그 | 3년 | 보안, 이상거래 탐지 |

### 7.2 개인정보 제3자 제공

> ⚠️ **결제 화면에서 반드시 별도 동의를 받아야 함**
>
> - 제공 대상: 셀러 (배송 처리 목적)
> - 제공 항목: 수령인명, 배송주소, 연락처, 주문 상품명
> - 제공 시점: 결제 완료 직후 셀러 대시보드에 표시
> - 동의 거부 시: 배송 처리 불가 (구매 진행 불가)

---

## 8. 개발 로드맵

### Phase 1 — MVP (0~3개월)

| 기능 | 우선순위 | 예상 공수 |
|------|----------|-----------|
| 셀러 회원가입 + 사업자 인증 | P0 | 2주 |
| 상품 등록 + 코드 발급 | P0 | 1주 |
| 구매자 코드 입력 + 상품 확인 | P0 | 1주 |
| PG사 결제 연동 (토스페이먼츠) | P0 | 2주 |
| 배송지 입력 + 주문 완료 | P0 | 1주 |
| 셀러 주문 목록 + 엑셀 다운로드 | P0 | 1주 |
| 기본 정산 처리 (수동) | P1 | 1주 |
| 이용약관 + 개인정보처리방침 페이지 | P0 | 3일 |

### Phase 2 — 고도화 (3~6개월)

- 자동 정산 배치 시스템
- 택배사 API 연동 (CJ대한통운, 롯데택배)
- 셀러 매출 분석 대시보드
- 구매자 주문 이력 (선택적 회원가입)
- 불법 상품 AI 키워드 필터
- CS 티켓 관리 시스템

### Phase 3 — 확장 (6개월~)

- 라이브 플랫폼 댓글 자동 감지 연동
- 구매자 모바일 앱 (iOS/Android)
- 셀러 플랜 구독 시스템
- 번들 코드 (여러 상품 묶음)
- 해외 배송 지원

---

## 9. Claude Code 개발 지시사항

### 9.1 프로젝트 초기화 명령

```
다음 스펙으로 LIVEORDER 프로젝트를 초기화해줘:

1. Next.js 14 (App Router) + TypeScript + Tailwind CSS 프로젝트 생성
2. PostgreSQL + Prisma ORM 설정
   - 스키마: sellers, products, codes, orders, settlements, seller_audit_log
3. NextAuth.js 셀러 인증 (이메일+비밀번호)
4. 토스페이먼츠 SDK 연동 및 웹훅 엔드포인트 구현
5. AWS S3 파일 업로드 설정 (사업자등록증 이미지)
6. Redis 설정 (코드 유효성 캐싱, TTL 관리)
7. ESLint + Prettier 설정
8. Docker Compose (개발 환경: PostgreSQL + Redis)
```

### 9.2 핵심 API 명세

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | /api/sellers/register | 셀러 회원가입 | 없음 |
| POST | /api/sellers/login | 셀러 로그인 | 없음 |
| POST | /api/products | 상품 등록 | 셀러 JWT |
| GET | /api/products | 내 상품 목록 | 셀러 JWT |
| POST | /api/codes/generate | 코드 발급 | 셀러 JWT |
| PUT | /api/codes/:id/toggle | 코드 활성화/비활성화 | 셀러 JWT |
| GET | /api/codes/:code | 코드 유효성 검증 | 없음 |
| POST | /api/orders | 주문 생성 | 없음 (구매자) |
| POST | /api/payments/confirm | 결제 확인 (PG 웹훅) | PG 서명 |
| GET | /api/orders/:id | 주문 조회 | 없음 (전화번호 인증) |
| GET | /api/seller/orders | 셀러 주문 목록 | 셀러 JWT |
| GET | /api/seller/orders/export | 배송지 엑셀 다운로드 | 셀러 JWT |
| POST | /api/seller/orders/:id/tracking | 운송장 등록 | 셀러 JWT |
| GET | /api/settlements | 정산 내역 | 셀러 JWT |
| POST | /api/admin/codes/:id/deactivate | 코드 강제 비활성화 | 관리자 JWT |
| POST | /api/admin/sellers/:id/suspend | 셀러 정지 | 관리자 JWT |

### 9.3 환경 변수 목록

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/liveorder

# Redis
REDIS_URL=redis://localhost:6379

# PG사 (토스페이먼츠)
TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
TOSS_WEBHOOK_SECRET=...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=liveorder-uploads

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLATFORM_FEE_RATE=0.025
SETTLEMENT_DELAY_DAYS=3
```

### 9.4 폴더 구조

```
liveorder/
├── app/
│   ├── (buyer)/          # 구매자 페이지
│   │   ├── page.tsx      # 코드 입력 메인
│   │   ├── order/[code]/ # 상품 확인 + 결제
│   │   └── complete/     # 주문 완료
│   ├── seller/           # 셀러 대시보드
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── codes/
│   │   ├── orders/
│   │   └── settlements/
│   ├── admin/            # 운영자 관리
│   └── api/              # API Routes
├── components/
├── lib/
│   ├── prisma.ts
│   ├── redis.ts
│   ├── toss.ts
│   └── s3.ts
├── prisma/
│   └── schema.prisma
└── docker-compose.yml
```

---

*본 문서는 Claude Code 개발 지시 및 플랫폼 설계 기준 문서입니다.*
*법적 사항은 변호사 검토 후 적용하시기 바랍니다.*
