import { randomBytes, createHash } from "crypto";

export function generateCodeKey(sellerId: string): string {
  const sellerHash = createHash("md5")
    .update(sellerId)
    .digest("hex")
    .slice(0, 3)
    .toUpperCase();

  const now = new Date();
  const datePart = `${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const random = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);

  return `${sellerHash}-${datePart}-${random}`;
}
