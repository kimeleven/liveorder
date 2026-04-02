"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
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
  seller: { name: string; businessNo: string };
}

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/settlements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSettlements(data);
      })
      .catch(() => {});
  }, []);

  async function runSettlementBatch() {
    const res = await fetch("/api/admin/settlements", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(`정산 처리 실패: ${data.error ?? res.status}`);
      return;
    }
    alert(`정산 처리 완료: ${data.processed}건 (주문 ${data.totalOrders}건)`);
    // 새로고침
    const updated = await fetch("/api/admin/settlements").then((r) => r.json());
    if (Array.isArray(updated)) setSettlements(updated);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">정산 관리</h1>
          <Button onClick={runSettlementBatch}>정산 배치 실행</Button>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    정산 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((s) => (
                  <TableRow key={s.id}>
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
        </Card>
      </div>
    </AdminShell>
  );
}
