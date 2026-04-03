"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface Props {
  data: Record<string, unknown>;
}

export default function OrderConfirmation({ data }: Props) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">주문이 완료되었습니다!</span>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">주문번호: </span>
            <span className="font-mono">
              {((data.orderId as string) ?? "").slice(0, 8).toUpperCase()}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">상품: </span>
            {data.productName as string} x {data.quantity as number}
          </p>
          <p>
            <span className="text-muted-foreground">결제금액: </span>
            ₩{((data.totalAmount as number) ?? 0).toLocaleString()}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          배송 정보가 등록되면 이 채팅에서 확인하실 수 있습니다.
        </p>
        {/* 전자상거래법 제13조 청약확인 고지 */}
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
          <p className="font-semibold">📋 청약확인 안내 (전자상거래법 제13조)</p>
          <p>결제일로부터 <strong>7일 이내</strong>에 청약철회(주문 취소)를 신청하실 수 있습니다.</p>
          <p>청약철회는 상단 <strong>주문조회</strong> 메뉴에서 주문번호와 전화번호로 조회 후 신청하세요.</p>
          <p className="text-blue-600">주문번호: <span className="font-mono">{((data.orderId as string) ?? "").toUpperCase()}</span></p>
        </div>
        <Button
          variant="outline"
          className="mt-2 w-full"
          onClick={() => (window.location.href = "/")}
        >
          새 코드 입력하기
        </Button>
      </CardContent>
    </Card>
  );
}
