"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SellerItem {
  id: string;
  email: string;
  name: string;
  repName: string;
  businessNo: string;
  phone: string;
  status: string;
  bizRegImageUrl?: string | null;
  createdAt: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  SUSPENDED: "destructive",
};

const statusLabel: Record<string, string> = {
  PENDING: "승인대기",
  APPROVED: "승인완료",
  SUSPENDED: "정지",
};

export default function AdminSellersPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [tab, setTab] = useState("ALL");
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/sellers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSellers(data);
      })
      .catch(() => {});
  }, []);

  async function updateStatus(id: string, status: string, sellerName: string) {
    const isDestructive = status === "SUSPENDED";
    if (isDestructive) {
      const action = status === "SUSPENDED" ? "거부/정지" : "복구";
      const confirmed = window.confirm(
        `${sellerName} 셀러를 ${action} 처리하시겠습니까?`
      );
      if (!confirmed) return;
    }

    setSubmitting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/sellers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("상태 변경 실패");

      setSellers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
      const actionLabel =
        status === "APPROVED"
          ? "승인"
          : status === "SUSPENDED"
          ? "정지"
          : "복구";
      toast.success(`${sellerName} 셀러가 ${actionLabel} 처리되었습니다.`);
    } catch {
      toast.error("상태 변경에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const filtered =
    tab === "ALL" ? sellers : sellers.filter((s) => s.status === tab);

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">셀러 관리</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ALL">전체</TabsTrigger>
            <TabsTrigger value="PENDING">승인대기</TabsTrigger>
            <TabsTrigger value="APPROVED">승인완료</TabsTrigger>
            <TabsTrigger value="SUSPENDED">정지</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상호명</TableHead>
                <TableHead>대표자</TableHead>
                <TableHead>사업자번호</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>사업자등록증</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    셀러가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((seller) => {
                  const isLoading = submitting.has(seller.id);
                  return (
                    <TableRow
                      key={seller.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/admin/sellers/${seller.id}`)}
                    >
                      <TableCell className="font-medium">{seller.name}</TableCell>
                      <TableCell>{seller.repName}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {seller.businessNo}
                      </TableCell>
                      <TableCell>{seller.email}</TableCell>
                      <TableCell>
                        {seller.bizRegImageUrl ? (
                          <a
                            href={seller.bizRegImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            보기
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">미첨부</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[seller.status]}>
                          {statusLabel[seller.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(seller.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {seller.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() =>
                                  updateStatus(seller.id, "APPROVED", seller.name)
                                }
                              >
                                {isLoading ? "처리 중..." : "승인"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isLoading}
                                onClick={() =>
                                  updateStatus(seller.id, "SUSPENDED", seller.name)
                                }
                              >
                                거부
                              </Button>
                            </>
                          )}
                          {seller.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isLoading}
                              onClick={() =>
                                updateStatus(seller.id, "SUSPENDED", seller.name)
                              }
                            >
                              {isLoading ? "처리 중..." : "정지"}
                            </Button>
                          )}
                          {seller.status === "SUSPENDED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isLoading}
                              onClick={() =>
                                updateStatus(seller.id, "APPROVED", seller.name)
                              }
                            >
                              {isLoading ? "처리 중..." : "복구"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminShell>
  );
}
