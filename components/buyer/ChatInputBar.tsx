"use client";

import { useState } from "react";
import { useBuyerStore } from "@/stores/buyer-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Props {
  onCodeSubmit: (code: string) => void;
}

export default function ChatInputBar({ onCodeSubmit }: Props) {
  const [input, setInput] = useState("");
  const currentFlow = useBuyerStore((s) => s.currentFlow);

  const isDisabled =
    currentFlow?.step !== undefined &&
    currentFlow.step !== "idle" &&
    currentFlow.step !== "complete";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    onCodeSubmit(trimmed);
    setInput("");
  }

  function formatCodeInput(value: string) {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    let formatted = clean;
    if (clean.length > 3) formatted = clean.slice(0, 3) + "-" + clean.slice(3);
    if (clean.length > 7)
      formatted = clean.slice(0, 3) + "-" + clean.slice(3, 7) + "-" + clean.slice(7, 11);
    return formatted;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t bg-white px-4 py-3"
    >
      <Input
        value={input}
        onChange={(e) => setInput(formatCodeInput(e.target.value))}
        placeholder={
          currentFlow?.step === "shop_entered"
            ? "위 목록에서 상품을 선택해주세요"
            : isDisabled
              ? "진행 중인 주문을 완료해주세요"
              : "상품 코드 입력 (예: K9A-2503-X7YZ)"
        }
        disabled={isDisabled}
        maxLength={14}
        className="font-mono tracking-wider"
      />
      <Button type="submit" size="icon" disabled={isDisabled || !input.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
