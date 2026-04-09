"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerShell from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Copy, MessageCircle, Search } from "lucide-react";
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
  const router = useRouter();
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'inactive' | 'all'>('active');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetch(`/api/seller/codes?page=${page}&status=${statusFilter}&q=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setCodes(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => {});
  }, [page, statusFilter, search]);

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

  function copyKakaoNotice(codeKey: string) {
    const text = `카카오톡에서 'liveorder' 채널을 친구추가한 후\n채팅창에 코드 [${codeKey}]를 입력하시면\n바로 결제하실 수 있습니다!`;
    navigator.clipboard.writeText(text);
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

        {/* 검색창 + 상태 필터 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="코드 또는 상품명 검색..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['active', 'expired', 'inactive', 'all'] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(s); setPage(1); }}
              >
                {s === 'active' ? '활성' : s === 'expired' ? '만료' : s === 'inactive' ? '중지' : '전체'}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>코드</TableHead>
                <TableHead>상품</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>사용/최대</TableHead>
                <TableHead>만료일시</TableHead>
                <TableHead>카카오 공지</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search
                      ? `"${search}"에 해당하는 코드가 없습니다.`
                      : statusFilter === 'active' ? '활성 코드가 없습니다.'
                      : statusFilter === 'expired' ? '만료된 코드가 없습니다.'
                      : statusFilter === 'inactive' ? '중지된 코드가 없습니다.'
                      : '발급된 코드가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : codes.map((code) => {
                const status = getStatus(code);
                return (
                  <TableRow
                    key={code.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push("/seller/codes/" + code.id)}
                  >
                    <TableCell className="font-mono font-semibold">
                      <div className="flex items-center gap-2">
                        {code.codeKey}
                        <button onClick={(e) => { e.stopPropagation(); copyCode(code.codeKey); }}>
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
                        variant="ghost"
                        className="gap-1 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-50"
                        onClick={(e) => { e.stopPropagation(); copyKakaoNotice(code.codeKey); }}
                        title="카카오 안내 문구 복사"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        공지 복사
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); toggleCode(code.id); }}
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

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </SellerShell>
  );
}
