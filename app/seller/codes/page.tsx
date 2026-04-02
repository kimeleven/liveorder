"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SellerShell from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Copy } from "lucide-react";
import Pagination from "@/components/ui/Pagination";

interface CodeItem {
  id: string;
  codeKey: string;
  expiresAt: string;
  maxQty: number;
  usedQty: number;
  isActive: boolean;
  product: { name: string };
}

export default function CodesPage() {
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch(`/api/seller/codes?page=${page}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setCodes(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => {});
  }, [page]);

  function getStatus(code: CodeItem) {
    if (!code.isActive) return { label: "중지", variant: "secondary" as const };
    if (new Date(code.expiresAt) < new Date())
      return { label: "만료", variant: "destructive" as const };
    if (code.maxQty > 0 && code.usedQty >= code.maxQty)
      return { label: "소진", variant: "outline" as const };
    return { label: "활성", variant: "default" as const };
  }

  async function toggleCode(id: string) {
    await fetch(`/api/seller/codes/${id}/toggle`, { method: "PUT" });
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  }

  function copyCode(codeKey: string) {
    navigator.clipboard.writeText(codeKey);
  }

  return (
    <SellerShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">코드 관리</h1>
            <p className="text-muted-foreground">발급된 코드를 관리하세요</p>
          </div>
          <Link href="/seller/codes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 코드 발급
            </Button>
          </Link>
        </div>

        {codes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                발급된 코드가 없습니다. 상품을 등록한 후 코드를 발급하세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>코드</TableHead>
                  <TableHead>상품</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>사용/최대</TableHead>
                  <TableHead>만료일시</TableHead>
                  <TableHead>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const status = getStatus(code);
                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-semibold">
                        <div className="flex items-center gap-2">
                          {code.codeKey}
                          <button onClick={() => copyCode(code.codeKey)}>
                            <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>{code.product.name}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {code.usedQty}/{code.maxQty === 0 ? "∞" : code.maxQty}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(code.expiresAt).toLocaleString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCode(code.id)}
                        >
                          {code.isActive ? "중지" : "활성화"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </SellerShell>
  );
}
