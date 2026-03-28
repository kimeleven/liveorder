"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface Props {
  data: Record<string, unknown>;
}

export default function OrderConfirmation({ data }: Props) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">주문이 완료되었습니다!</span>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">주문번호: </span>
            <span className="font-mono">
              {((data.orderId as string) ?? "").slice(0, 8).toUpperCase()}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">상품: </span>
            {data.productName as string} x {data.quantity as number}
          </p>
          <p>
            <span className="text-muted-foreground">결제금액: </span>
            ₩{((data.totalAmount as number) ?? 0).toLocaleString()}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          배송 정보가 등록되면 이 채팅에서 확인하실 수 있습니다.
        </p>
      </CardContent>
    </Card>
  );
}
