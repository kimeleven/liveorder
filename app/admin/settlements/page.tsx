"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SettlementItem {
  id: string;
  amount: number;
  fee: number;
  pgFee: number;
  netAmount: number;
  status: string;
  scheduledAt: string;
  settledAt: string | null;
  seller: { name: string; businessNo: string };
}

const TABS = ["ALL", "PENDING", "COMPLETED", "FAILED"] as const;
const TAB_LABELS: Record<string, string> = {
  ALL: "전체",
  PENDING: "대기",
  COMPLETED: "완료",
  FAILED: "실패",
};
const LIMIT = 20;

export default function AdminSettlementsPage() {
  const router = useRouter();
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [batchResult, setBatchResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [tab, setTab] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchSettlements(
    currentPage = page,
    currentTab = tab,
    currentFrom = fromDate,
    currentTo = toDate
  ) {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(LIMIT),
    });
    if (currentTab !== "ALL") params.set("status", currentTab);
    if (currentFrom) params.set("from", currentFrom);
    if (currentTo) params.set("to", currentTo);
    const res = await fetch(`/api/admin/settlements?${params}`);
    const data = await res.json();
    if (data.data) {
      setSettlements(data.data);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    }
  }

  useEffect(() => {
    fetchSettlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTabChange(newTab: string) {
    setTab(newTab);
    setPage(1);
    fetchSettlements(1, newTab, fromDate, toDate);
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    window.location.href = `/api/admin/settlements/export?${params}`;
  }

  async function runSettlementBatch() {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await fetch("/api/admin/settlements", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setBatchResult({
          type: "error",
          message: `정산 처리 실패: ${data.error ?? res.status}`,
        });
        return;
      }
      setBatchResult({
        type: "success",
        message: `정산 처리 완료: ${data.processed}건 (주문 ${data.totalOrders}건)`,
      });
      fetchSettlements(1, tab, fromDate, toDate);
      setPage(1);
    } catch {
      setBatchResult({
        type: "error",
        message: "정산 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setBatchLoading(false);
    }
  }

  const hasFilter = tab !== "ALL" || !!fromDate || !!toDate;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">정산 관리</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              {hasFilter ? "필터 조건으로 CSV" : "CSV 내보내기"}
            </Button>
            <Button onClick={runSettlementBatch} disabled={batchLoading}>
              {batchLoading ? "처리 중..." : "정산 배치 실행"}
            </Button>
          </div>
        </div>

        {batchResult && (
          <div
            className={`rounded-md px-4 py-3 text-sm font-medium ${
              batchResult.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {batchResult.message}
          </div>
        )}

        {/* 날짜 필터 */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              시작일
            </Label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
                fetchSettlements(1, tab, e.target.value, toDate);
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              종료일
            </Label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
                fetchSettlements(1, tab, fromDate, e.target.value);
              }}
            />
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setPage(1);
                fetchSettlements(1, tab, "", "");
              }}
            >
              초기화
            </Button>
          )}
        </div>

        {/* 상태 탭 */}
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange(t)}
            >
              {TAB_LABELS[t]}
            </Button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>셀러</TableHead>
                <TableHead>거래금액</TableHead>
                <TableHead>수수료</TableHead>
                <TableHead>PG수수료</TableHead>
                <TableHead>실지급액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>정산예정일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    정산 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/settlements/${s.id}`)}
                  >
                    <TableCell>{s.seller.name}</TableCell>
                    <TableCell>₩{s.amount.toLocaleString()}</TableCell>
                    <TableCell>₩{s.fee.toLocaleString()}</TableCell>
                    <TableCell>₩{s.pgFee.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">
                      ₩{s.netAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "COMPLETED"
                            ? "default"
                            : s.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {s.status === "COMPLETED"
                          ? "완료"
                          : s.status === "FAILED"
                          ? "실패"
                          : "대기"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(s.scheduledAt).toLocaleDateString("ko-KR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">총 {total}건</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    fetchSettlements(page - 1);
                  }}
                >
                  이전
                </Button>
                <span className="text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    fetchSettlements(page + 1);
                  }}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
