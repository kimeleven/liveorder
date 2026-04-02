"use client";

import { useEffect, useState } from "react";
import SellerShell from "@/components/seller/SellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  createdAt: string;
}

type FilterStatus = "ALL" | "PENDING" | "COMPLETED" | "FAILED";

const filterOptions: { label: string; value: FilterStatus }[] = [
  { label: "전체", value: "ALL" },
  { label: "대기", value: "PENDING" },
  { label: "완료", value: "COMPLETED" },
  { label: "실패", value: "FAILED" },
];

const statusLabel: Record<string, string> = {
  PENDING: "대기",
  COMPLETED: "완료",
  FAILED: "실패",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  COMPLETED: "default",
  FAILED: "destructive",
  PENDING: "secondary",
};

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("ALL");

  useEffect(() => {
    fetch("/api/seller/settlements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSettlements(data);
      })
      .catch(() => {});
  }, []);

  const filtered =
    filter === "ALL" ? settlements : settlements.filter((s) => s.status === filter);

  const totals = filtered.reduce(
    (acc, s) => ({
      amount: acc.amount + s.amount,
      fee: acc.fee + s.fee,
      pgFee: acc.pgFee + s.pgFee,
      netAmount: acc.netAmount + s.netAmount,
    }),
    { amount: 0, fee: 0, pgFee: 0, netAmount: 0 }
  );

  return (
    <SellerShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">정산 내역</h1>
          <p className="text-muted-foreground">
            결제 완료 후 D+3 영업일에 정산됩니다
          </p>
        </div>

        {/* 합계 카드 */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-normal">총 거래금액</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-lg font-semibold">₩{totals.amount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-normal">총 플랫폼 수수료</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-lg font-semibold text-red-600">-₩{totals.fee.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-normal">총 PG 수수료</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-lg font-semibold text-red-600">-₩{totals.pgFee.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground font-normal">총 실지급액</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-lg font-semibold text-green-600">₩{totals.netAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 필터 */}
        <div className="flex gap-2">
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={filter === opt.value ? "default" : "outline"}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
              {opt.value !== "ALL" && (
                <span className="ml-1 text-xs">
                  ({settlements.filter((s) => s.status === opt.value).length})
                </span>
              )}
            </Button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>정산 예정일</TableHead>
                <TableHead>거래금액</TableHead>
                <TableHead>플랫폼 수수료</TableHead>
                <TableHead>PG 수수료</TableHead>
                <TableHead>실지급액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>정산일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    정산 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {new Date(s.scheduledAt).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell>₩{s.amount.toLocaleString()}</TableCell>
                    <TableCell>₩{s.fee.toLocaleString()}</TableCell>
                    <TableCell>₩{s.pgFee.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">
                      ₩{s.netAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[s.status] ?? "secondary"}>
                        {statusLabel[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.settledAt
                        ? new Date(s.settledAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </SellerShell>
  );
}
