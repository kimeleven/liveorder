"use client";

import { useBuyerStore } from "@/stores/buyer-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  data: Record<string, unknown>;
}

export default function PaymentSummary({ data }: Props) {
  const { currentFlow, updateFlowStep, addMessage } = useBuyerStore();
  const isInteractive = currentFlow?.step === "payment_pending";
  const totalAmount = (data.totalAmount as number) ?? 0;
  const product = data.product as Record<string, unknown>;
  const seller = data.seller as Record<string, unknown>;

  async function handlePayment() {
    // 주문 생성 API 호출
    const address = data.address as Record<string, unknown>;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeId: currentFlow?.codeId,
          buyerName: address.buyerName,
          buyerPhone: address.buyerPhone,
          address: address.address,
          addressDetail: address.addressDetail,
          memo: address.memo,
          quantity: data.quantity,
          amount: totalAmount,
        }),
      });

      const order = await res.json();
      if (!res.ok) {
        addMessage({
          direction: "incoming",
          type: "error",
          payload: { text: order.error || "주문 생성에 실패했습니다." },
        });
        return;
      }

      // 결제 완료 처리 (실제 PG 연동 전 시뮬레이션)
      updateFlowStep("payment_complete", { orderId: order.id });
      addMessage({
        direction: "incoming",
        type: "order-confirmation",
        payload: {
          orderId: order.id,
          productName: product?.name,
          quantity: data.quantity,
          totalAmount,
          status: "PAID",
          createdAt: new Date().toISOString(),
        },
      });
      updateFlowStep("complete");
      useBuyerStore.getState().setFlow({
        step: "idle",
      });
    } catch {
      addMessage({
        direction: "incoming",
        type: "error",
        payload: { text: "결제 처리 중 오류가 발생했습니다." },
      });
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-medium">주문 요약</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {product?.name as string} x {data.quantity as number}
            </span>
            <span>₩{totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold text-base border-t pt-2">
            <span>결제금액</span>
            <span>₩{totalAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          본 플랫폼(LIVEORDER)은 통신판매중개업자로서 거래 당사자가 아닙니다.
          상품의 품질, 적법성, 배송에 관한 책임은 판매자에게 있습니다.
          <br />
          판매자: {seller?.name as string} | 사업자번호:{" "}
          {seller?.businessNo as string}
        </div>
        {isInteractive && (
          <Button className="w-full text-base h-12" onClick={handlePayment}>
            ₩{totalAmount.toLocaleString()} 결제하기
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
