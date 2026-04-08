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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Truck } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/skeleton";

const carriers = [
  { value: "CJ대한통운", label: "CJ대한통운" },
  { value: "로젠택배", label: "로젠택배" },
  { value: "한진택배", label: "한진택배" },
  { value: "롯데택배", label: "롯데택배" },
  { value: "우체국택배", label: "우체국택배" },
];

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
  source: string;
  code: { codeKey: string; product: { name: string } };
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "결제완료", variant: "default" },
  SHIPPING: { label: "배송중", variant: "secondary" },
  DELIVERED: { label: "배송완료", variant: "secondary" },
  SETTLED: { label: "정산완료", variant: "outline" },
  REFUNDED: { label: "환불", variant: "destructive" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [trackingDialog, setTrackingDialog] = useState<{ open: boolean; orderId: string }>({
    open: false,
    orderId: "",
  });
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrders(currentPage = page, currentStatus = statusFilter) {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (currentStatus) params.set('status', currentStatus);
      const r = await fetch(`/api/seller/orders?${params.toString()}`);
      const res = await r.json();
      if (res.data) {
        setOrders(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      console.error('[seller/orders] fetch failed:', err);
      setError('주문 목록을 불러오지 못했습니다. 새로고침해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders(page, statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  function openTrackingDialog(orderId: string) {
    setTrackingDialog({ open: true, orderId });
    setTrackingCarrier("");
    setTrackingNo("");
    setTrackingError("");
  }

  async function submitTracking() {
    if (!trackingCarrier || !trackingNo) {
      setTrackingError("택배사와 운송장번호를 입력해주세요.");
      return;
    }
    if (!/^\d{10,15}$/.test(trackingNo)) {
      setTrackingError("운송장번호는 숫자 10~15자리입니다.");
      return;
    }

    setTrackingLoading(true);
    setTrackingError("");
    try {
      const res = await fetch(`/api/seller/orders/${trackingDialog.orderId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier: trackingCarrier, trackingNo }),
      });
      if (!res.ok) {
        const data = await res.json();
        setTrackingError(data.error || "등록에 실패했습니다.");
        return;
      }
      setTrackingDialog({ open: false, orderId: "" });
      fetchOrders(page);
    } catch {
      setTrackingError("서버 오류가 발생했습니다.");
    } finally {
      setTrackingLoading(false);
    }
  }

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
              주문 {total}건
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter || 'ALL'}
              onValueChange={(v) => {
                setStatusFilter(v === 'ALL' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="전체 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="PAID">결제완료</SelectItem>
                <SelectItem value="SHIPPING">배송중</SelectItem>
                <SelectItem value="DELIVERED">배송완료</SelectItem>
                <SelectItem value="REFUNDED">환불</SelectItem>
              </SelectContent>
            </Select>
            {orders.length > 0 && (
              <Button variant="outline" onClick={downloadExcel}>
                <Download className="mr-2 h-4 w-4" /> 배송지 다운로드
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
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
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {order.source === 'kakao' && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-yellow-100 text-yellow-800 border-yellow-200">
                              카카오
                            </Badge>
                          )}
                          {order.buyerName}
                        </div>
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>₩{order.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.trackingNo ? (
                          `${order.carrier} ${order.trackingNo}`
                        ) : (order.status === "PAID" || order.status === "SHIPPING") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTrackingDialog(order.id)}
                          >
                            <Truck className="mr-1 h-3 w-3" />
                            운송장 등록
                          </Button>
                        ) : (
                          "-"
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

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

        <Dialog open={trackingDialog.open} onOpenChange={(open) => setTrackingDialog({ open, orderId: open ? trackingDialog.orderId : "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>운송장 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>택배사</Label>
                <Select value={trackingCarrier} onValueChange={(v) => setTrackingCarrier(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="택배사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>운송장번호</Label>
                <Input
                  placeholder="숫자 10~15자리"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value.replace(/\D/g, ""))}
                  maxLength={15}
                />
              </div>
              {trackingError && (
                <p className="text-sm text-destructive">{trackingError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTrackingDialog({ open: false, orderId: "" })}
              >
                취소
              </Button>
              <Button onClick={submitTracking} disabled={trackingLoading}>
                {trackingLoading ? "등록 중..." : "등록"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SellerShell>
  );
}
