"use client";

import { Card, CardContent } from "@/components/ui/card";

interface Props {
  data: Record<string, unknown>;
}

export default function ProductCard({ data }: Props) {
  const product = data.product as Record<string, unknown>;
  const seller = data.seller as Record<string, unknown>;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg">
            {product?.name as string}
          </h3>
          {product?.description ? (
            <p className="text-sm text-muted-foreground mt-1">
              {String(product.description)}
            </p>
          ) : null}
        </div>
        <div className="text-2xl font-bold">
          ₩{((product?.price as number) ?? 0).toLocaleString()}
        </div>
        <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">판매자 정보</p>
          <p>판매자: {seller?.name as string}</p>
          <p>사업자번호: {seller?.businessNo as string}</p>
          {seller?.tradeRegNo ? (
            <p>통신판매업신고: {String(seller.tradeRegNo)}</p>
          ) : null}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          본 플랫폼(LIVEORDER)은 통신판매중개업자로서 거래 당사자가 아닙니다.
          상품의 품질, 적법성, 배송에 관한 책임은 판매자에게 있습니다.
        </div>
      </CardContent>
    </Card>
  );
}
