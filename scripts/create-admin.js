// 관리자 계정 생성 스크립트
// 실행: DATABASE_URL=... node scripts/create-admin.js
require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("❌ DATABASE_URL 환경변수가 없습니다.");
  console.error("사용법: DATABASE_URL=postgresql://... node scripts/create-admin.js");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("DB 연결 완료");

  const email = "kimeleven@gmail.com";
  const password = "qwer1234";
  const name = "관리자";

  const hashed = await bcrypt.hash(password, 10);

  const result = await client.query(
    `INSERT INTO admins (id, email, password, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password = $3, name = $4
     RETURNING id, email, name`,
    [crypto.randomUUID(), email, hashed, name]
  );

  console.log("\n✅ 관리자 계정 생성/업데이트 완료:");
  console.log(`  이메일: ${result.rows[0].email}`);
  console.log(`  이름: ${result.rows[0].name}`);
  console.log(`  비밀번호: ${password}`);
  console.log(`\n로그인 URL: /admin/auth/login`);

  await client.end();
}

main().catch((e) => {
  console.error("❌ 오류:", e.message);
  process.exit(1);
});
