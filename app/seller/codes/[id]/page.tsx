"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import SellerShell from "@/components/seller/SellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import Pagination from "@/components/ui/Pagination";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface CodeDetailResponse {
  code: {
    id: string;
    codeKey: string;
    expiresAt: string;
    maxQty: number;
    usedQty: number;
    isActive: boolean;
    createdAt: string;
    product: { id: string; name: string; price: number; imageUrl: string | null };
  };
  stats: { totalOrders: number; totalRevenue: number; avgOrderAmount: number };
  orders: {
    id: string;
    buyerName: string;
    buyerPhone: string;
    quantity: number;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function getCodeStatus(code: CodeDetailResponse["code"]) {
  if (!code.isActive) return { label: "중지", variant: "secondary" as BadgeVariant };
  if (new Date(code.expiresAt) < new Date())
    return { label: "만료", variant: "destructive" as BadgeVariant };
  if (code.maxQty > 0 && code.usedQty >= code.maxQty)
    return { label: "소진", variant: "outline" as BadgeVariant };
  return { label: "활성", variant: "default" as BadgeVariant };
}

function getOrderStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PAID: { label: "결제완료", variant: "default" },
    SHIPPING: { label: "배송중", variant: "secondary" },
    DELIVERED: { label: "배송완료", variant: "outline" },
    SETTLED: { label: "정산완료", variant: "outline" },
    REFUNDED: { label: "환불", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as BadgeVariant };
}

export default function CodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CodeDetailResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ expiresAt: "", maxQty: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/seller/codes/${id}?page=${page}`)
      .then((r) => {
        if (!r.ok) throw new Error("코드를 찾을 수 없습니다.");
        return r.json();
      })
      .then((res) => setData(res))
      .catch(() => toast.error("코드 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggle() {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/seller/codes/${id}/toggle`, { method: "PUT" });
      if (!res.ok) throw new Error();
      setData((prev) =>
        prev ? { ...prev, code: { ...prev.code, isActive: !prev.code.isActive } } : prev
      );
      toast.success(data.code.isActive ? "코드가 중지되었습니다." : "코드가 활성화되었습니다.");
    } catch {
      toast.error("코드 상태 변경에 실패했습니다.");
    } finally {
      setToggling(false);
    }
  }

  function openEdit() {
    if (!data) return;
    const d = new Date(data.code.expiresAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEditForm({ expiresAt: local, maxQty: String(data.code.maxQty) });
    setEditOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/seller/codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : undefined,
          maxQty: editForm.maxQty !== "" ? Number(editForm.maxQty) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "저장 실패");
        return;
      }
      toast.success("코드가 수정되었습니다.");
      setEditOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 코드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/seller/codes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "삭제 실패");
        return;
      }
      toast.success("코드가 삭제되었습니다.");
      router.push("/seller/codes");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <SellerShell>
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </SellerShell>
    );
  }

  if (!data) {
    return (
      <SellerShell>
        <div className="p-8 text-muted-foreground">코드를 찾을 수 없습니다.</div>
      </SellerShell>
    );
  }

  const { code, stats, orders, pagination } = data;
  const codeStatus = getCodeStatus(code);

  return (
    <SellerShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            코드 목록
          </Button>
          <h1 className="text-2xl font-bold font-mono">{code.codeKey}</h1>
          <Badge variant={codeStatus.variant}>{codeStatus.label}</Badge>
          <Button variant="outline" size="sm" onClick={openEdit} disabled={!data}>
            <Pencil className="h-4 w-4 mr-1" /> 편집
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting || !data}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "삭제"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : null}
            {code.isActive ? "비활성화" : "활성화"}
          </Button>
        </div>

        {/* 코드 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">코드 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">상품명</p>
              <Link
                href={`/seller/products/${code.product.id}`}
                className="font-medium text-primary hover:underline"
              >
                {code.product.name}
              </Link>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">유효기간</p>
              <p className="font-medium">
                {new Date(code.expiresAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">최대 수량</p>
              <p className="font-medium">
                {code.maxQty === 0 ? "무제한" : `${code.maxQty}개`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">사용 / 잔여</p>
              <p className="font-medium">
                {code.usedQty}개 사용 /{" "}
                {code.maxQty === 0
                  ? "무제한"
                  : `${code.maxQty - code.usedQty}개 남음`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">총 주문 수</p>
              <p className="text-2xl font-bold mt-1">{stats.totalOrders}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">총 매출</p>
              <p className="text-2xl font-bold mt-1">
                {stats.totalRevenue.toLocaleString("ko-KR")}원
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">평균 주문금액</p>
              <p className="text-2xl font-bold mt-1">
                {stats.avgOrderAmount.toLocaleString("ko-KR")}원
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 주문 목록 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이 코드의 주문</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                아직 이 코드로 들어온 주문이 없습니다.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>구매자</TableHead>
                      <TableHead>전화</TableHead>
                      <TableHead>수량</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>일시</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const orderStatus = getOrderStatusBadge(order.status);
                      return (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push("/seller/orders/" + order.id)}
                        >
                          <TableCell className="font-mono text-xs">
                            {order.id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell>{order.buyerName}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {order.buyerPhone}
                          </TableCell>
                          <TableCell>{order.quantity}개</TableCell>
                          <TableCell>
                            {order.amount.toLocaleString("ko-KR")}원
                          </TableCell>
                          <TableCell>
                            <Badge variant={orderStatus.variant}>
                              {orderStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString("ko-KR")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {pagination.totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      page={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 편집 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>코드 편집</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>만료일</Label>
              <Input
                type="datetime-local"
                value={editForm.expiresAt}
                onChange={(e) => setEditForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>
                최대 주문 수량{" "}
                <span className="text-muted-foreground text-xs">(0 = 무제한)</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={editForm.maxQty}
                onChange={(e) => setEditForm((f) => ({ ...f, maxQty: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerShell>
  );
}
