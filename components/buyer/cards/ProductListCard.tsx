"use client";

import { useState } from "react";
import { useBuyerStore, FlowProduct, FlowSeller } from "@/stores/buyer-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
}

interface Props {
  data: Record<string, unknown>;
}

export default function ProductListCard({ data }: Props) {
  const products = data.products as Product[];
  const shopCode = data.shopCode as string;
  const sellerName = data.sellerName as string;
  const { currentFlow, addMessage, setFlow } = useBuyerStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  // shop_entered 단계일 때만 활성화
  const isActive = currentFlow?.step === "shop_entered";

  async function handleSelect(product: Product) {
    if (!isActive || loadingId) return;
    setLoadingId(product.id);
    setErrorId(null);

    try {
      const res = await fetch(`/api/sellers/${shopCode}/products/${product.id}/code`);
      const responseData = await res.json();

      if (!res.ok) {
        setErrorId(product.id);
        setLoadingId(null);
        return;
      }

      // outgoing: 상품 선택 메시지
      addMessage({
        direction: "outgoing",
        type: "text",
        payload: { text: product.name },
      });

      // incoming: 상품 카드
      addMessage({
        direction: "incoming",
        type: "product-card",
        payload: { product: responseData.product, seller: responseData.seller },
      });

      // incoming: 수량 선택기
      addMessage({
        direction: "incoming",
        type: "quantity-selector",
        payload: {
          price: responseData.product.price,
          remainingQty: responseData.code.remainingQty,
        },
      });

      // flow 업데이트
      setFlow({
        step: "product_shown",
        shopCode,
        codeId: responseData.code.id,
        productId: responseData.product.id,
        product: responseData.product as FlowProduct,
        seller: responseData.seller as FlowSeller,
      });
    } catch {
      setErrorId(product.id);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-2 w-full">
      <p className="text-sm text-muted-foreground">
        {sellerName}의 상품 목록입니다. 주문할 상품을 선택해주세요.
      </p>
      {products.map((product) => (
        <Card key={product.id} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {product.imageUrl ? (
                <div className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0">
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0 text-xs text-muted-foreground">
                  없음
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.name}</p>
                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {product.description}
                  </p>
                )}
                <p className="text-sm font-semibold text-primary mt-0.5">
                  {product.price.toLocaleString()}원
                </p>
              </div>
              <Button
                size="sm"
                disabled={!isActive || loadingId !== null}
                onClick={() => handleSelect(product)}
                className="flex-shrink-0"
              >
                {loadingId === product.id ? "처리 중..." : "주문"}
              </Button>
            </div>
            {errorId === product.id && (
              <p className="text-xs text-destructive mt-1">현재 주문 불가 상품입니다.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
