"use client";

import { useEffect, useRef } from "react";
import { useBuyerStore } from "@/stores/buyer-store";
import ChatContainer from "@/components/buyer/ChatContainer";
import ChatInputBar from "@/components/buyer/ChatInputBar";
import ActiveOrdersStrip from "@/components/buyer/ActiveOrdersStrip";
import Link from "next/link";

export default function ChatPage() {
  const { addMessage, setFlow, currentFlow, messages } = useBuyerStore();
  const initialized = useRef(false);

  useEffect(() => {
    // 처음 진입 시 환영 메시지
    if (!initialized.current && messages.length === 0) {
      initialized.current = true;
      addMessage({
        direction: "incoming",
        type: "text",
        payload: { text: "LIVEORDER에 오신 것을 환영합니다! 상품 코드를 입력해주세요." },
      });
    }

    // 랜딩에서 코드 검증 후 진입한 경우
    const pending = sessionStorage.getItem("pendingCode");
    if (pending) {
      sessionStorage.removeItem("pendingCode");
      const { code, data } = JSON.parse(pending);
      handleCodeData(code, data);
    }
  }, []);

  function handleCodeData(
    codeKey: string,
    data: { code: Record<string, unknown>; product: Record<string, unknown>; seller: Record<string, unknown> }
  ) {
    // 기존 진행 중인 주문이 있으면 구분선
    if (messages.some((m) => m.type === "order-confirmation")) {
      addMessage({
        direction: "incoming",
        type: "divider",
        payload: { text: "새 주문" },
      });
    }

    // 코드 입력 표시
    addMessage({
      direction: "outgoing",
      type: "text",
      payload: { text: codeKey },
    });

    // 상품 카드 표시
    addMessage({
      direction: "incoming",
      type: "product-card",
      payload: { product: data.product, seller: data.seller },
    });

    // 수량 선택기 표시
    addMessage({
      direction: "incoming",
      type: "quantity-selector",
      payload: {
        price: (data.product as Record<string, unknown>).price,
        remainingQty: (data.code as Record<string, unknown>).remainingQty,
      },
    });

    // 플로우 시작
    setFlow({
      step: "product_shown",
      codeKey,
      codeId: (data.code as Record<string, unknown>).id as string,
      productId: (data.product as Record<string, unknown>).id as string,
      product: data.product,
      seller: data.seller,
    });
  }

  async function handleCodeSubmit(codeKey: string) {
    addMessage({
      direction: "outgoing",
      type: "text",
      payload: { text: codeKey },
    });

    try {
      const res = await fetch(`/api/codes/${codeKey}`);
      const data = await res.json();

      if (!data.valid) {
        addMessage({
          direction: "incoming",
          type: "error",
          payload: { text: data.reason || "유효하지 않은 코드입니다.", retryAction: "code" },
        });
        return;
      }

      handleCodeData(codeKey, data);
    } catch {
      addMessage({
        direction: "incoming",
        type: "error",
        payload: { text: "서버 오류가 발생했습니다. 다시 시도해주세요.", retryAction: "code" },
      });
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          LIVEORDER
        </Link>
        <Link
          href="/lookup"
          className="text-xs text-muted-foreground hover:underline"
        >
          주문조회
        </Link>
      </div>

      <ActiveOrdersStrip />
      <ChatContainer />
      <ChatInputBar onCodeSubmit={handleCodeSubmit} />
    </>
  );
}
