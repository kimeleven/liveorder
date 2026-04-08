-- Task 40: 주문 소스 추적 (web/kakao)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "source" VARCHAR(10) NOT NULL DEFAULT 'web';
