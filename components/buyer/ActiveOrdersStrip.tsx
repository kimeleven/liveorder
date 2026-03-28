"use client";

import { useBuyerStore } from "@/stores/buyer-store";
import { Badge } from "@/components/ui/badge";

export default function ActiveOrdersStrip() {
  const messages = useBuyerStore((s) => s.messages);

  // 주문 확인 메시지에서 주문 목록 추출
  const orders = messages
    .filter((m) => m.type === "order-confirmation")
    .map((m) => ({
      orderId: m.payload.orderId as string,
      productName: m.payload.productName as string,
      status: m.payload.status as string,
    }));

  if (orders.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b bg-white px-4 py-2">
      <span className="text-xs text-muted-foreground shrink-0">주문:</span>
      {orders.map((order) => (
        <Badge
          key={order.orderId}
          variant="outline"
          className="shrink-0 text-xs"
        >
          {order.productName}{" "}
          {order.status === "PAID" ? "결제완료" : order.status === "SHIPPING" ? "배송중" : ""}
        </Badge>
      ))}
    </div>
  );
}
