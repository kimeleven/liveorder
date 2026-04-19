-- MVP-001: shopCode + kakaoPayId 셀러 필드 추가
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "shop_code" VARCHAR(6);
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "kakao_pay_id" VARCHAR(100);

-- shop_code unique index
CREATE UNIQUE INDEX IF NOT EXISTS "sellers_shop_code_key" ON "sellers"("shop_code");

-- MVP-001: OrderStatus enum에 TRANSFER_PENDING, CONFIRMED 추가
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'TRANSFER_PENDING' BEFORE 'PAID';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED' BEFORE 'PAID';

-- MVP-001: KakaoPaySession 테이블 제거
ALTER TABLE "kakao_pay_sessions" DROP CONSTRAINT IF EXISTS "kakao_pay_sessions_code_id_fkey";
DROP TABLE IF EXISTS "kakao_pay_sessions";
