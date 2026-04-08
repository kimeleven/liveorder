-- Task 34: 사업자등록증 이미지 URL 필드 추가
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "biz_reg_image_url" TEXT;

-- Task 35: 카카오 결제 세션 테이블 생성
CREATE TABLE IF NOT EXISTS "kakao_pay_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" VARCHAR(64) NOT NULL,
    "code_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kakao_pay_sessions_pkey" PRIMARY KEY ("id")
);

-- Unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "kakao_pay_sessions_token_key" ON "kakao_pay_sessions"("token");

-- Foreign key to codes
ALTER TABLE "kakao_pay_sessions" DROP CONSTRAINT IF EXISTS "kakao_pay_sessions_code_id_fkey";
ALTER TABLE "kakao_pay_sessions" ADD CONSTRAINT "kakao_pay_sessions_code_id_fkey"
    FOREIGN KEY ("code_id") REFERENCES "codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
