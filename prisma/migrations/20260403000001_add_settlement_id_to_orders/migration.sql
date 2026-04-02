-- AlterTable: Order에 settlement_id FK 추가
ALTER TABLE "orders" ADD COLUMN "settlement_id" UUID;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
