"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function OrderCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;

    const codeKey = code.replace(/-/g, "").toUpperCase();
    if (codeKey.length < 10) {
      setError("올바른 코드 형식이 아닙니다.");
      return;
    }

    // Format code with dashes if not already formatted
    const formatted =
      code.includes("-")
        ? code.toUpperCase()
        : `${codeKey.slice(0, 3)}-${codeKey.slice(3, 7)}-${codeKey.slice(7, 11)}`;

    fetch(`/api/codes/${formatted}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) {
          setError(data.reason || "유효하지 않은 코드입니다.");
          return;
        }
        sessionStorage.setItem(
          "pendingCode",
          JSON.stringify({ code: formatted, data })
        );
        router.replace("/chat");
      })
      .catch(() => {
        setError("서버 오류가 발생했습니다.");
      });
  }, [code, router]);

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 text-center space-y-4">
        <p className="text-destructive font-semibold">{error}</p>
        <a href="/" className="underline text-sm text-muted-foreground">
          처음으로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 text-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">코드 확인 중...</p>
    </div>
  );
}
