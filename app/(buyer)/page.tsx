"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BuyerLandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function formatCodeInput(value: string) {
    const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    let formatted = clean;
    if (clean.length > 3) formatted = clean.slice(0, 3) + "-" + clean.slice(3);
    if (clean.length > 7)
      formatted =
        clean.slice(0, 3) + "-" + clean.slice(3, 7) + "-" + clean.slice(7, 11);
    return formatted;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const codeKey = code.replace(/-/g, "").toUpperCase();
    if (codeKey.length < 10) {
      setError("올바른 코드 형식이 아닙니다.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/codes/${code}`);
      const data = await res.json();

      if (!data.valid) {
        setError(data.reason || "유효하지 않은 코드입니다.");
        setLoading(false);
        return;
      }

      // 채팅 페이지로 이동하면서 코드 데이터 전달
      sessionStorage.setItem("pendingCode", JSON.stringify({ code: code, data }));
      router.push("/chat");
    } catch {
      setError("서버 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-bold text-center">LIVEORDER</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-bold">상품 코드 입력</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              라이브 방송에서 안내받은 코드를 입력하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(formatCodeInput(e.target.value))}
              placeholder="AAA-0000-XXXX"
              className="text-center text-2xl font-mono tracking-[0.3em] h-14"
              maxLength={14}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || code.length < 12}
            >
              {loading ? "확인 중..." : "코드 확인"}
            </Button>
          </form>

          <div className="text-sm">
            <Link
              href="/lookup"
              className="text-muted-foreground hover:text-foreground underline"
            >
              기존 주문 조회
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">
          이용약관
        </Link>
        {" · "}
        <Link href="/terms/privacy" className="hover:underline">
          개인정보처리방침
        </Link>
      </div>
    </div>
  );
}
