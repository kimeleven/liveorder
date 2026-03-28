"use client";

import { ChatMessage } from "@/stores/buyer-store";
import { cn } from "@/lib/utils";
import ProductCard from "./cards/ProductCard";
import QuantitySelector from "./cards/QuantitySelector";
import AddressForm from "./cards/AddressForm";
import PaymentSummary from "./cards/PaymentSummary";
import OrderConfirmation from "./cards/OrderConfirmation";
import TrackingUpdate from "./cards/TrackingUpdate";

interface Props {
  message: ChatMessage;
}

export default function ChatMessageBubble({ message }: Props) {
  const isIncoming = message.direction === "incoming";

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
      "quantity-selector",
      "address-form",
      "payment-summary",
      "order-confirmation",
      "tracking-update",
    ].includes(message.type)
  ) {
    return (
      <div className="w-full">
        {message.type === "product-card" && (
          <ProductCard data={message.payload} />
        )}
        {message.type === "quantity-selector" && (
          <QuantitySelector data={message.payload} />
        )}
        {message.type === "address-form" && (
          <AddressForm data={message.payload} />
        )}
        {message.type === "payment-summary" && (
          <PaymentSummary data={message.payload} />
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
