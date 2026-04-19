"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BuyerLandingPage() {
  const router = useRouter();
  const [shopCode, setShopCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const entryError = sessionStorage.getItem("shopEntryError");
    if (entryError) {
      sessionStorage.removeItem("shopEntryError");
      setError(entryError);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = shopCode.trim().toLowerCase();
    if (!/^[a-z0-9]{6}$/.test(code)) {
      setError("쇼핑몰 코드는 영소문자+숫자 6자리입니다.");
      return;
    }
    setLoading(true);
    setError("");
    router.push(`/s/${code}`);
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
            <h2 className="text-2xl font-bold">쇼핑몰 코드 입력</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              셀러에게 전달받은 쇼핑몰 코드를 입력하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={shopCode}
              onChange={(e) => setShopCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              placeholder="abc123"
              className="text-center text-2xl font-mono tracking-[0.3em] h-14"
              maxLength={6}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || shopCode.length !== 6}
            >
              {loading ? "이동 중..." : "쇼핑몰 입장"}
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
