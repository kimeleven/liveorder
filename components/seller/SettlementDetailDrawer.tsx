"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface OrderInSettlement {
  id: string;
  buyerName: string;
  amount: number;
  status: string;
  createdAt: string;
  code: {
    product: { name: string };
  };
}

interface SettlementDetail {
  id: string;
  amount: number;
  fee: number;
  pgFee: number;
  netAmount: number;
  status: string;
  scheduledAt: string;
  settledAt: string | null;
  orders: OrderInSettlement[];
}

interface SettlementDetailDrawerProps {
  settlementId: string | null;
  onClose: () => void;
}

const statusLabel: Record<string, string> = {
  PAID: "결제완료",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  SETTLED: "정산완료",
  REFUNDED: "환불",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  SHIPPING: "outline",
  DELIVERED: "secondary",
  SETTLED: "default",
  REFUNDED: "destructive",
};

export default function SettlementDetailDrawer({
  settlementId,
  onClose,
}: SettlementDetailDrawerProps) {
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!settlementId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/seller/settlements/${settlementId}`)
      .then((r) => r.json())
      .then((data) => setDetail(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [settlementId]);

  return (
    <Sheet open={!!settlementId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>정산 상세 내역</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            불러오는 중...
          </div>
        )}

        {!loading && detail && (
          <div className="mt-6 space-y-6">
            {/* 정산 요약 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">정산 예정일</p>
                <p className="font-medium">
                  {new Date(detail.scheduledAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">정산일</p>
                <p className="font-medium">
                  {detail.settledAt
                    ? new Date(detail.settledAt).toLocaleDateString("ko-KR")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">거래금액</p>
                <p className="font-medium">₩{detail.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">플랫폼 수수료</p>
                <p className="font-medium text-red-600">-₩{detail.fee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">PG 수수료</p>
                <p className="font-medium text-red-600">-₩{detail.pgFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">실지급액</p>
                <p className="font-semibold text-green-600">₩{detail.netAmount.toLocaleString()}</p>
              </div>
            </div>

            <hr />

            {/* 포함 주문 목록 */}
            <div>
              <h3 className="font-semibold mb-3">
                포함 주문 ({detail.orders.length}건)
              </h3>
              {detail.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">포함된 주문이 없습니다.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>구매자</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>결제일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">
                          {order.code.product.name}
                        </TableCell>
                        <TableCell>{order.buyerName}</TableCell>
                        <TableCell>₩{order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[order.status] ?? "secondary"}>
                            {statusLabel[order.status] ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
