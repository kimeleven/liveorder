"use client";

import { ChatMessage, useBuyerStore } from "@/stores/buyer-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ProductCard from "./cards/ProductCard";
import ProductListCard from "./cards/ProductListCard";
import QuantitySelector from "./cards/QuantitySelector";
import AddressForm from "./cards/AddressForm";
import TransferOptions from "./TransferOptions";
import OrderConfirmation from "./cards/OrderConfirmation";
import TrackingUpdate from "./cards/TrackingUpdate";

interface Props {
  message: ChatMessage;
}

export default function ChatMessageBubble({ message }: Props) {
  const isIncoming = message.direction === "incoming";
  const { setFlow, updateFlowStep, addMessage } = useBuyerStore();

  if (message.type === "divider") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">
          {(message.payload.text as string) || "새 주문"}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  // 카드형 메시지 (전체 너비)
  if (
    [
      "product-card",
      "product-list",
      "quantity-selector",
      "address-form",
      "transfer-options",
      "order-confirmation",
      "tracking-update",
    ].includes(message.type)
  ) {
    return (
      <div className="w-full">
        {message.type === "product-card" && (
          <ProductCard data={message.payload} />
        )}
        {message.type === "product-list" && (
          <ProductListCard data={message.payload} />
        )}
        {message.type === "quantity-selector" && (
          <QuantitySelector data={message.payload} />
        )}
        {message.type === "address-form" && (
          <AddressForm data={message.payload} />
        )}
        {message.type === "transfer-options" && (
          <TransferOptions
            orderId={message.payload.orderId as string}
            bank={message.payload.bank as string}
            accountNo={message.payload.accountNo as string}
            amount={message.payload.amount as number}
            kakaoPayId={message.payload.kakaoPayId as string | null}
            onConfirmed={() => {
              updateFlowStep("transfer_confirmed");
              addMessage({
                direction: "incoming",
                type: "order-confirmation",
                payload: {
                  orderId: message.payload.orderId,
                  productName: message.payload.productName,
                  quantity: message.payload.quantity,
                  totalAmount: message.payload.amount,
                  status: "TRANSFER_PENDING",
                  createdAt: new Date().toISOString(),
                },
              });
              setFlow({ step: "idle" });
            }}
          />
        )}
        {message.type === "order-confirmation" && (
          <OrderConfirmation data={message.payload} />
        )}
        {message.type === "tracking-update" && (
          <TrackingUpdate data={message.payload} />
        )}
      </div>
    );
  }

  // 에러 메시지 (재시도 버튼 포함)
  if (message.type === "error") {
    const retryAction = message.payload.retryAction as "code" | undefined;

    function handleRetry() {
      if (retryAction === "code") {
        setFlow({ step: "idle" });
      }
    }

    return (
      <div className="flex justify-start">
        <div className="flex flex-col gap-2 max-w-[80%]">
          <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-destructive/10 text-destructive border border-destructive/20">
            {message.payload.text as string}
          </div>
          {retryAction && (
            <Button
              variant="outline"
              size="sm"
              className="self-start text-xs h-7"
              onClick={handleRetry}
            >
              다시 시도
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 텍스트 메시지
  return (
    <div
      className={cn("flex", isIncoming ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isIncoming
            ? "bg-muted text-foreground rounded-bl-sm"
            : "bg-primary text-primary-foreground rounded-br-sm"
        )}
      >
        {message.payload.text as string}
      </div>
    </div>
  );
}
