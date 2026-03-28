"use client";

import { useEffect, useRef } from "react";
import { useBuyerStore, ChatMessage } from "@/stores/buyer-store";
import ChatMessageBubble from "./ChatMessage";

export default function ChatContainer() {
  const messages = useBuyerStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
