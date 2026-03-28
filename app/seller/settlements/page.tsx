"use client";

import { useEffect, useState } from "react";
import SellerShell from "@/components/seller/SellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);

  useEffect(() => {
    fetch("/api/seller/settlements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSettlements(data);
      })
      .catch(() => {});
  }, []);

  return (
    <SellerShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">정산 내역</h1>
          <p className="text-muted-foreground">
            결제 완료 후 D+3 영업일에 정산됩니다
          </p>
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
              {settlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    정산 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((s) => (
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
