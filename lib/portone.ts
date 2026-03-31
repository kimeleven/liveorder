const PORTONE_BASE = "https://api.portone.io";
const API_SECRET = process.env.PORTONE_API_SECRET ?? "";

export interface PortOnePayment {
  id: string;
  status:
    | "VIRTUAL_ACCOUNT_ISSUED"
    | "PAID"
    | "FAILED"
    | "CANCELLED"
    | "PAY_PENDING";
  amount: { total: number; currency: string };
  orderName: string;
  paidAt?: string;
  receiptUrl?: string;
}

export async function getPayment(paymentId: string): Promise<PortOnePayment> {
  const res = await fetch(
    `${PORTONE_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `PortOne ${API_SECRET}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`PortOne API error: ${res.status}`);
  }
  return res.json();
}
