-- Task 64: 구매자 IP 필드 추가 (이상 거래 모니터링)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_ip" VARCHAR(45);
