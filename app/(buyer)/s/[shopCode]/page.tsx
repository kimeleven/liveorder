"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShopCodeEntryPage({
  params,
}: {
  params: { shopCode: string };
}) {
  const router = useRouter();

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch(`/api/sellers/${params.shopCode}`);
        if (!res.ok) {
          const data = await res.json();
          sessionStorage.setItem(
            "shopEntryError",
            data.error || "유효하지 않은 쇼핑몰 링크입니다."
          );
          router.replace("/");
          return;
        }
        const seller = await res.json();
        sessionStorage.setItem("pendingShop", JSON.stringify({ shopCode: params.shopCode, seller }));
        router.replace("/chat");
      } catch {
        sessionStorage.setItem("shopEntryError", "서버 오류가 발생했습니다.");
        router.replace("/");
      }
    }
    resolve();
  }, [params.shopCode, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted-foreground">쇼핑몰로 이동 중...</p>
    </div>
  );
}
