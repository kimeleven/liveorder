"use client";

import { useEffect, useState } from "react";
import SellerShell from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

interface OrderItem {
  id: string;
  buyerName: string;
  buyerPhone: string;
  quantity: number;
  amount: number;
  status: string;
  trackingNo: string | null;
  carrier: string | null;
  createdAt: string;
  code: { codeKey: string; product: { name: string } };
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "결제완료", variant: "default" },
  SHIPPING: { label: "배송중", variant: "secondary" },
  SETTLED: { label: "정산완료", variant: "outline" },
  REFUNDED: { label: "환불", variant: "destructive" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetch("/api/seller/orders")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(() => {});
  }, []);

  async function downloadExcel() {
    const res = await fetch("/api/seller/orders/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SellerShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">주문 관리</h1>
            <p className="text-muted-foreground">
              주문 {orders.length}건
            </p>
          </div>
          {orders.length > 0 && (
            <Button variant="outline" onClick={downloadExcel}>
              <Download className="mr-2 h-4 w-4" /> 배송지 다운로드
            </Button>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문일시</TableHead>
                <TableHead>상품</TableHead>
                <TableHead>코드</TableHead>
                <TableHead>구매자</TableHead>
                <TableHead>수량</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>운송장</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    주문이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const st = statusMap[order.status] ?? {
                    label: order.status,
                    variant: "outline" as const,
                  };
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm">
                        {new Date(order.createdAt).toLocaleString("ko-KR")}
                      </TableCell>
                      <TableCell>{order.code.product.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.code.codeKey}
                      </TableCell>
                      <TableCell>{order.buyerName}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>₩{order.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.trackingNo
                          ? `${order.carrier} ${order.trackingNo}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </SellerShell>
  );
}
