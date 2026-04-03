"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTrackingUrl } from "@/lib/carrier-urls";

interface OrderResult {
  id: string;
  buyerName: string;
  quantity: number;
  amount: number;
  status: string;
  trackingNo: string | null;
  carrier: string | null;
  createdAt: string;
  code: { codeKey: string; product: { name: string } };
}

const statusLabel: Record<string, string> = {
  PAID: "결제완료",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  SETTLED: "정산완료",
  REFUNDED: "환불",
};

const WITHDRAW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default function LookupPage() {
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawDone, setWithdrawDone] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  async function handleWithdraw() {
    if (!order) return;
    if (!confirm("청약철회를 신청하시겠습니까? 신청 후 영업일 3일 이내 처리됩니다.")) return;
    setWithdrawLoading(true);
    setWithdrawError("");
    try {
      const res = await fetch(`/api/orders/${order.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerPhone: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWithdrawError(data.error || "청약철회 신청에 실패했습니다.");
      } else {
        setWithdrawDone(true);
      }
    } catch {
      setWithdrawError("서버 오류가 발생했습니다.");
    }
    setWithdrawLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch(
        `/api/orders/${orderId}?phone=${encodeURIComponent(phone)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "주문을 찾을 수 없습니다.");
      } else {
        setOrder(data);
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-lg font-bold">
          LIVEORDER
        </Link>
        <span className="text-sm text-muted-foreground">주문 조회</span>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderId">주문번호</Label>
            <Input
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="주문번호 입력"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "조회 중..." : "주문 조회"}
          </Button>
        </form>

        {order && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{order.code.product.name}</h3>
                <Badge>{statusLabel[order.status] ?? order.status}</Badge>
              </div>
              <div className="text-sm space-y-1">
                <p>수량: {order.quantity}개</p>
                <p>금액: ₩{order.amount.toLocaleString()}</p>
                <p>주문일: {new Date(order.createdAt).toLocaleString("ko-KR")}</p>
                {/* 청약철회 버튼 — 전자상거래법 제17조: PAID + 7일 이내 */}
                {order.status === "PAID" &&
                  Date.now() - new Date(order.createdAt).getTime() <= WITHDRAW_WINDOW_MS && (
                  <div className="mt-3 pt-3 border-t">
                    {withdrawDone ? (
                      <p className="text-sm text-green-700 font-medium">
                        ✅ 청약철회 요청이 접수되었습니다. 영업일 3일 이내 처리됩니다.
                      </p>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                          onClick={handleWithdraw}
                          disabled={withdrawLoading}
                        >
                          {withdrawLoading ? "처리 중..." : "청약철회 신청 →"}
                        </Button>
                        {withdrawError && (
                          <p className="mt-1 text-xs text-destructive">{withdrawError}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          결제일로부터 7일 이내 청약철회 신청 가능 (전자상거래법 제17조)
                        </p>
                      </>
                    )}
                  </div>
                )}
                {order.trackingNo && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-800">배송 정보</p>
                    <p>택배사: {order.carrier}</p>
                    <p>운송장: {order.trackingNo}</p>
                    {order.carrier && (
                      (() => {
                        const url = getTrackingUrl(order.carrier, order.trackingNo!);
                        return url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-sm text-blue-600 underline hover:text-blue-800"
                          >
                            배송 추적 →
                          </a>
                        ) : null;
                      })()
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
