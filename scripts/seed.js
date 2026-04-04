// 테스트 데이터 시드 스크립트 (pg 드라이버 직접 사용)
require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const DB_URL = process.env.DATABASE_URL;

function uuid() {
  return crypto.randomUUID();
}

function randomHex(len) {
  return crypto.randomBytes(len).toString("hex").toUpperCase().slice(0, len);
}

function generateCodeKey(sellerHash) {
  const now = new Date();
  const mmdd = String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
  const rand = randomHex(4);
  return `${sellerHash}-${mmdd}-${rand}`;
}

const STATUSES = ["PAID", "SHIPPING", "SETTLED", "REFUNDED"];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("DB 연결 완료");

  // 0. 관리자 생성
  const adminPassword = await bcrypt.hash("qwer1234", 10);
  await client.query(
    `INSERT INTO admins (id, email, password, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [uuid(), "kimeleven@gmail.com", adminPassword, "관리자"]
  );
  console.log("관리자 생성:", "kimeleven@gmail.com / qwer1234");

  // 1. 판매자 생성
  const sellerPassword = await bcrypt.hash("qwer1234", 10);
  const sellerId = uuid();
  const sellerHash = crypto.createHash("md5").update(sellerId).digest("hex").slice(0, 3).toUpperCase();

  await client.query(
    `INSERT INTO sellers (id, email, password, business_no, name, rep_name, address, phone, status, plan)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'APPROVED', 'FREE')
     ON CONFLICT (email) DO NOTHING`,
    [
      sellerId,
      "testseller@liveorder.kr",
      sellerPassword,
      "123-45-67890",
      "테스트셀러",
      "김판매",
      "서울시 강남구 테헤란로 123",
      "010-1234-5678",
    ]
  );
  console.log("판매자 생성:", "testseller@liveorder.kr / qwer1234");

  // 실제 생성된 seller id 가져오기
  const { rows: sellerRows } = await client.query(`SELECT id FROM sellers WHERE email = $1`, ["testseller@liveorder.kr"]);
  const actualSellerId = sellerRows[0].id;
  const actualSellerHash = crypto.createHash("md5").update(actualSellerId).digest("hex").slice(0, 3).toUpperCase();

  // 2. 상품 5개 생성
  const products = [
    { name: "프리미엄 스킨케어 세트", description: "수분 집중 케어 3종 세트", price: 89000, category: "뷰티/화장품" },
    { name: "여름 린넨 셔츠", description: "시원한 소재의 루즈핏 린넨 셔츠", price: 45000, category: "패션의류" },
    { name: "천연 꿀 500g", description: "국내산 아카시아 꿀 100%", price: 28000, category: "식품" },
    { name: "무선 블루투스 이어폰", description: "노이즈캔슬링 + 30시간 배터리", price: 79000, category: "전자기기" },
    { name: "향기 디퓨저 세트", description: "라벤더 & 유칼립투스 리드 디퓨저", price: 35000, category: "생활용품" },
  ];

  const productIds = [];
  for (const p of products) {
    const pid = uuid();
    await client.query(
      `INSERT INTO products (id, seller_id, name, description, price, stock, category, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [pid, actualSellerId, p.name, p.description, p.price, 999, p.category]
    );
    productIds.push({ id: pid, price: p.price, name: p.name });
    console.log("상품 생성:", p.name);
  }

  // 3. 코드 100개 생성 (상태별 분배)
  // 활성 + 미만료: 40개
  // 활성 + 만료: 20개
  // 비활성: 20개
  // 주문 있는 것: 20개 (각 상태별 5개씩)

  const usedCodes = new Set();
  let codeCount = 0;

  async function createCode(productId, isActive, expiresAt, maxQty = 0) {
    let codeKey;
    do {
      codeKey = generateCodeKey(actualSellerHash);
    } while (usedCodes.has(codeKey));
    usedCodes.add(codeKey);

    const cid = uuid();
    await client.query(
      `INSERT INTO codes (id, product_id, code_key, expires_at, max_qty, used_qty, is_active)
       VALUES ($1, $2, $3, $4, $5, 0, $6)`,
      [cid, productId, codeKey, expiresAt, maxQty, isActive]
    );
    codeCount++;
    return cid;
  }

  const now = new Date();
  const future = new Date(now.getTime() + 48 * 3600 * 1000);   // 48시간 후
  const past = new Date(now.getTime() - 24 * 3600 * 1000);    // 24시간 전
  const oldDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000); // 10일 전

  // 활성 + 미만료 40개
  for (let i = 0; i < 40; i++) {
    const p = productIds[i % productIds.length];
    await createCode(p.id, true, future, i % 5 === 0 ? 50 : 0);
  }
  console.log("활성(미만료) 코드 40개 생성");

  // 활성 + 만료 20개
  for (let i = 0; i < 20; i++) {
    const p = productIds[i % productIds.length];
    await createCode(p.id, true, past);
  }
  console.log("활성(만료) 코드 20개 생성");

  // 비활성 20개
  for (let i = 0; i < 20; i++) {
    const p = productIds[i % productIds.length];
    await createCode(p.id, false, future);
  }
  console.log("비활성 코드 20개 생성");

  // 주문 있는 코드 20개 (상태별 5개씩: PAID, SHIPPING, SETTLED, REFUNDED)
  for (let si = 0; si < STATUSES.length; si++) {
    const status = STATUSES[si];
    for (let i = 0; i < 5; i++) {
      const p = productIds[(si * 5 + i) % productIds.length];
      const cid = await createCode(p.id, true, future);
      const qty = Math.floor(Math.random() * 3) + 1;
      const amount = p.price * qty;
      const orderCreatedAt = new Date(oldDate.getTime() + i * 3600 * 1000);

      // used_qty 업데이트
      await client.query(`UPDATE codes SET used_qty = $1 WHERE id = $2`, [qty, cid]);

      // 주문 생성
      const oid = uuid();
      await client.query(
        `INSERT INTO orders (id, code_id, buyer_name, buyer_phone, address, quantity, amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          oid, cid,
          `구매자${si * 5 + i + 1}`,
          `010-${String(1000 + si * 5 + i).padStart(4, "0")}-5678`,
          "서울시 마포구 홍대입구로 99",
          qty, amount, status, orderCreatedAt
        ]
      );

      // SETTLED 상태면 정산 레코드도 생성
      if (status === "SETTLED") {
        const fee = Math.round(amount * 0.025);
        const pgFee = Math.round(amount * 0.022);
        const net = amount - fee - pgFee;
        await client.query(
          `INSERT INTO settlements (id, seller_id, amount, fee, pg_fee, net_amount, status, scheduled_at, settled_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $7)`,
          [uuid(), actualSellerId, amount, fee, pgFee, net, orderCreatedAt]
        );
      }
    }
    console.log(`${status} 주문 5개 생성`);
  }

  console.log(`\n완료! 총 코드 ${codeCount}개 생성`);
  console.log("\n테스트 계정:");
  console.log("  판매자: testseller@liveorder.kr / qwer1234");
  console.log("  관리자: kimeleven@gmail.com / qwer1234");

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
