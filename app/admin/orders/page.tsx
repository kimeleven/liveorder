"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import RefundDialog from "@/components/admin/RefundDialog";
import { Skeleton } from "@/components/ui/skeleton";
import Pagination from "@/components/ui/Pagination";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderItem {
  id: string;
  buyerName: string;
  amount: number;
  status: string;
  createdAt: string;
  code: {
    product: {
      name: string;
      seller: { name: string };
    };
  };
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "PAID", label: "결제완료" },
  { value: "SHIPPING", label: "배송중" },
  { value: "DELIVERED", label: "배송완료" },
  { value: "SETTLED", label: "정산완료" },
  { value: "REFUNDED", label: "환불" },
];

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "결제완료", variant: "default" },
  SHIPPING: { label: "배송중", variant: "secondary" },
  DELIVERED: { label: "배송완료", variant: "outline" },
  SETTLED: { label: "정산완료", variant: "secondary" },
  REFUNDED: { label: "환불", variant: "destructive" },
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [refundTarget, setRefundTarget] = useState<{
    id: string;
    amount: number;
    buyerName: string;
    productName: string;
  } | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleStatusChange(value: string | null) {
    setStatusFilter(value ?? "ALL");
    setPage(1);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">주문 관리</h1>
          <span className="text-sm text-muted-foreground">총 {total}건</span>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>주문번호</TableHead>
                <TableHead>셀러</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>구매자</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>결제일</TableHead>
                <TableHead>액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    주문 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const badge = STATUS_BADGE[order.status] ?? { label: order.status, variant: "secondary" as const };
                  const canRefund = ["PAID", "SHIPPING", "DELIVERED"].includes(order.status);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-sm">{order.code.product.seller.name}</TableCell>
                      <TableCell className="text-sm">{order.code.product.name}</TableCell>
                      <TableCell className="text-sm">{order.buyerName}</TableCell>
                      <TableCell className="text-sm">₩{order.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canRefund && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() =>
                              setRefundTarget({
                                id: order.id,
                                amount: order.amount,
                                buyerName: order.buyerName,
                                productName: order.code.product.name,
                              })
                            }
                          >
                            환불
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
        )}

        {!isLoading && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {refundTarget && (
        <RefundDialog
          order={refundTarget}
          isOpen={!!refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={fetchOrders}
        />
      )}
    </AdminShell>
  );
}
