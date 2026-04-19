export function tosSendLink(
  bank: string,
  accountNo: string,
  amount: number
): string {
  return `supertoss://send?bank=${encodeURIComponent(bank)}&accountNo=${accountNo}&amount=${amount}`;
}

export function kakaoPayQrUrl(kakaoPayId: string, amount: number): string {
  const hexValue = (amount * 524288).toString(16);
  return `https://qr.kakaopay.com/${kakaoPayId}${hexValue}`;
}
