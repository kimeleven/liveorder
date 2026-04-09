"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Download } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const LIMIT = 20;

export default function AdminSellersPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [tab, setTab] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());

  // 검색어 디바운스 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function fetchSellers(
    currentPage = page,
    currentTab = tab,
    currentSearch = search
  ) {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(LIMIT),
    });
    if (currentTab !== "ALL") params.set("status", currentTab);
    if (currentSearch) params.set("q", currentSearch);

    const res = await fetch(`/api/admin/sellers?${params}`);
    const data = await res.json();
    if (data.data) {
      setSellers(data.data);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    }
  }

  // 탭·검색어·페이지 변경 시 재조회
  useEffect(() => {
    fetchSellers(page, tab, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab, search]);

  function handleTabChange(newTab: string) {
    setTab(newTab);
    setPage(1);
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (search) params.set("q", search);
    window.location.href = `/api/admin/sellers/export?${params}`;
  }

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

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">셀러 관리</h1>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            CSV 내보내기
          </Button>
        </div>

        {/* 검색창 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름, 이메일, 사업자번호 검색..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* 상태 탭 */}
        <Tabs value={tab} onValueChange={handleTabChange}>
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
              {sellers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    셀러가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                sellers.map((seller) => {
                  const isLoading = submitting.has(seller.id);
                  return (
                    <TableRow
                      key={seller.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/admin/sellers/${seller.id}`)}
                    >
                      <TableCell className="font-medium">
                        {seller.name}
                      </TableCell>
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
                          <span className="text-xs text-muted-foreground">
                            미첨부
                          </span>
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
                                  updateStatus(
                                    seller.id,
                                    "APPROVED",
                                    seller.name
                                  )
                                }
                              >
                                {isLoading ? "처리 중..." : "승인"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isLoading}
                                onClick={() =>
                                  updateStatus(
                                    seller.id,
                                    "SUSPENDED",
                                    seller.name
                                  )
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
                                updateStatus(
                                  seller.id,
                                  "SUSPENDED",
                                  seller.name
                                )
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
                                updateStatus(
                                  seller.id,
                                  "APPROVED",
                                  seller.name
                                )
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

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">총 {total}건</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
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
