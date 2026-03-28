"use client";

import { useState } from "react";
import { useBuyerStore } from "@/stores/buyer-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface Props {
  data: Record<string, unknown>;
}

export default function QuantitySelector({ data }: Props) {
  const [qty, setQty] = useState(1);
  const { currentFlow, updateFlowStep, addMessage } = useBuyerStore();
  const price = (data.price as number) ?? 0;
  const maxQty = (data.remainingQty as number | null) ?? 99;
  const isInteractive = currentFlow?.step === "product_shown";

  function handleConfirm() {
    addMessage({
      direction: "outgoing",
      type: "text",
      payload: { text: `${qty}개 선택` },
    });
    updateFlowStep("quantity_selected", { quantity: qty });
    // 주소 입력 폼 표시
    addMessage({
      direction: "incoming",
      type: "address-form",
      payload: { quantity: qty, totalAmount: price * qty },
    });
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-medium">수량을 선택해주세요</p>
        <div className="flex items-center justify-center gap-4">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setQty(Math.max(1, qty - 1))}
            disabled={!isInteractive || qty <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-2xl font-bold w-12 text-center">{qty}</span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setQty(Math.min(maxQty, qty + 1))}
            disabled={!isInteractive || qty >= maxQty}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center">
          <span className="text-lg font-semibold">
            합계: ₩{(price * qty).toLocaleString()}
          </span>
        </div>
        {isInteractive && (
          <Button className="w-full" onClick={handleConfirm}>
            수량 확인
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
