-- AlterTable: Seller에 이메일 인증 필드 추가
ALTER TABLE "sellers" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sellers" ADD COLUMN "email_verify_token" VARCHAR(100);
