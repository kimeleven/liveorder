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
import { Download, Truck, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
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

interface ProductOption {
  id: string;
  name: string;
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
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkParsed, setBulkParsed] = useState<{ orderId: string; carrier: string; trackingNo: string }[]>([]);
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: { orderId: string; error: string }[] } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const router = useRouter();

  // 상품 목록 로드 (비활성 상품 포함)
  useEffect(() => {
    fetch('/api/seller/products?status=all&limit=100')
      .then(r => r.json())
      .then(res => {
        if (res.data) setProducts(res.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  async function fetchOrders(
    currentPage = page,
    currentStatus = statusFilter,
    currentQuery = searchQuery,
    currentFrom = fromDate,
    currentTo = toDate,
    currentProductId = productId,
  ) {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (currentStatus) params.set('status', currentStatus);
      if (currentQuery) params.set('q', currentQuery);
      if (currentFrom) params.set('from', currentFrom);
      if (currentTo) params.set('to', currentTo);
      if (currentProductId) params.set('productId', currentProductId);
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
    fetchOrders(page, statusFilter, searchQuery, fromDate, toDate, productId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, searchQuery, fromDate, toDate, productId]);

  // 30초마다 자동 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOrders(page, statusFilter, searchQuery, fromDate, toDate, productId);
    }, 30000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, searchQuery, fromDate, toDate, productId]);

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

  function parseBulkCsv(text: string) {
    const lines = text.trim().split('\n').slice(1) // 헤더 제거
    return lines
      .map((line) => {
        const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
        return { orderId: cols[0] ?? '', carrier: cols[1] ?? '', trackingNo: cols[2] ?? '' }
      })
      .filter((r) => r.orderId && r.carrier && r.trackingNo)
  }

  function downloadBulkTemplate() {
    const csv = '\uFEFF주문ID,택배사,운송장번호\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tracking_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBulkError('')
    setBulkResult(null)
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseBulkCsv(text)
      setBulkParsed(parsed)
      if (parsed.length === 0) setBulkError('유효한 데이터가 없습니다. 템플릿을 확인해주세요.')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function submitBulkTracking() {
    if (bulkParsed.length === 0) return
    setBulkLoading(true)
    setBulkError('')
    try {
      const res = await fetch('/api/seller/orders/tracking/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: bulkParsed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBulkError(data.error || '업로드에 실패했습니다.')
        return
      }
      setBulkResult(data)
      if (data.success > 0) fetchOrders(page)
    } catch {
      setBulkError('서버 오류가 발생했습니다.')
    } finally {
      setBulkLoading(false)
    }
  }

  const hasDateOrProductFilter = !!(fromDate || toDate || productId);

  function clearDateProductFilters() {
    setFromDate('');
    setToDate('');
    setProductId('');
    setPage(1);
  }

  async function downloadExcel() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (searchQuery) params.set('q', searchQuery);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    if (productId) params.set('productId', productId);

    const res = await fetch(`/api/seller/orders/export?${params.toString()}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // 파일명은 서버 Content-Disposition에서 오지만 브라우저 기본값 사용
    const today = new Date().toISOString().slice(0, 10);
    if (fromDate && toDate) {
      a.download = `orders_${fromDate}_${toDate}_${today}.csv`;
    } else {
      a.download = `orders_${today}.csv`;
    }
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
          <div className="flex items-center gap-3 flex-wrap">
            <form onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput); setPage(1) }}
              className="flex gap-2 items-center">
              <Input
                placeholder="구매자명 또는 전화번호"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-44 h-8"
              />
              <Button type="submit" variant="outline" size="sm">검색</Button>
              {searchQuery && (
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1) }}>
                  초기화
                </Button>
              )}
            </form>
            <Select
              value={statusFilter || 'ALL'}
              onValueChange={(v) => {
                setStatusFilter(v === 'ALL' || !v ? '' : v);
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
                <Download className="mr-2 h-4 w-4" />
                {hasDateOrProductFilter ? '필터 조건으로 CSV 내보내기' : '배송지 다운로드'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setBulkDialog(true)
                setBulkParsed([])
                setBulkResult(null)
                setBulkError('')
              }}
            >
              <Upload className="mr-2 h-4 w-4" /> 일괄 운송장 등록
            </Button>
          </div>
        </div>

        {/* 날짜 범위 + 상품 필터 */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">시작일</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPage(1); }}
              className="h-8 w-36"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">종료일</Label>
            <Input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setPage(1); }}
              className="h-8 w-36"
            />
          </div>
          <Select
            value={productId || 'ALL'}
            onValueChange={(v) => { setProductId(v === 'ALL' ? '' : (v ?? '')); setPage(1); }}
          >
            <SelectTrigger className="w-44 h-8">
              <SelectValue placeholder="전체 상품" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 상품</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasDateOrProductFilter && (
            <Button variant="ghost" size="sm" onClick={clearDateProductFilters} className="h-8 gap-1">
              <X className="h-3 w-3" /> 필터 초기화
            </Button>
          )}
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
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/seller/orders/${order.id}`)}
                    >
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
                            onClick={e => {
                              e.stopPropagation()
                              openTrackingDialog(order.id)
                            }}
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
        <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>운송장 일괄 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>CSV 파일로 여러 주문의 운송장을 한번에 등록합니다.</span>
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadBulkTemplate}>
                  템플릿 다운로드
                </Button>
              </div>
              <div className="space-y-1">
                <Label>CSV 파일 선택</Label>
                <Input type="file" accept=".csv" onChange={handleBulkFileChange} />
                <p className="text-xs text-muted-foreground">
                  형식: 주문ID, 택배사, 운송장번호 (헤더 포함)
                </p>
              </div>
              {bulkParsed.length > 0 && !bulkResult && (
                <p className="text-sm text-muted-foreground">
                  {bulkParsed.length}건 파싱 완료. 업로드 버튼을 클릭하세요.
                </p>
              )}
              {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}
              {bulkResult && (
                <div className="rounded-md border p-3 space-y-1 text-sm">
                  <p className="text-green-600 font-medium">✓ 성공: {bulkResult.success}건</p>
                  {bulkResult.failed > 0 && (
                    <>
                      <p className="text-destructive font-medium">✗ 실패: {bulkResult.failed}건</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                        {bulkResult.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>{e.orderId.slice(0, 8)}… — {e.error}</li>
                        ))}
                        {bulkResult.errors.length > 5 && (
                          <li>외 {bulkResult.errors.length - 5}건...</li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDialog(false)}>닫기</Button>
              {!bulkResult && (
                <Button
                  onClick={submitBulkTracking}
                  disabled={bulkLoading || bulkParsed.length === 0}
                >
                  {bulkLoading ? '업로드 중...' : `${bulkParsed.length}건 업로드`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SellerShell>
  );
}
