"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { ArrowLeft, Plus } from "lucide-react";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface ProductDetailResponse {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  codes: {
    id: string;
    codeKey: string;
    isActive: boolean;
    expiresAt: string;
    maxQty: number;
    usedQty: number;
    createdAt: string;
    _count: { orders: number };
  }[];
  stats: { totalOrders: number; totalRevenue: number; activeCodeCount: number };
}

function getCodeStatus(code: ProductDetailResponse["codes"][0]) {
  if (!code.isActive) return { label: "중지", variant: "secondary" as BadgeVariant };
  if (new Date(code.expiresAt) < new Date())
    return { label: "만료", variant: "destructive" as BadgeVariant };
  if (code.maxQty > 0 && code.usedQty >= code.maxQty)
    return { label: "소진", variant: "outline" as BadgeVariant };
  return { label: "활성", variant: "default" as BadgeVariant };
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/seller/products/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("상품을 찾을 수 없습니다.");
        return r.json();
      })
      .then((res) => setProduct(res))
      .catch(() => toast.error("상품 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SellerShell>
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </SellerShell>
    );
  }

  if (!product) {
    return (
      <SellerShell>
        <div className="p-8 text-muted-foreground">상품을 찾을 수 없습니다.</div>
      </SellerShell>
    );
  }

  return (
    <SellerShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            상품 목록
          </Button>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <Badge variant={product.isActive ? "default" : "secondary"}>
            {product.isActive ? "판매중" : "중지"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/seller/products/${id}/edit`)}
          >
            수정
          </Button>
        </div>

        {/* 상품 정보 카드 */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 이미지 */}
              <div className="flex items-center justify-center">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="max-h-48 w-full object-contain rounded-md border"
                  />
                ) : (
                  <div className="h-48 w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
                    이미지 없음
                  </div>
                )}
              </div>
              {/* 상세 정보 */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">카테고리</span>
                  <span className="font-medium">{product.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">가격</span>
                  <span className="font-semibold text-lg">
                    ₩{product.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">재고</span>
                  <span className="font-medium">{product.stock}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">등록일</span>
                  <span className="font-medium">
                    {new Date(product.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                {product.description && (
                  <div>
                    <p className="text-muted-foreground mb-1">설명</p>
                    <p className="font-medium">{product.description}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">총 주문 수</p>
              <p className="text-2xl font-bold mt-1">{product.stats.totalOrders}건</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">총 매출</p>
              <p className="text-2xl font-bold mt-1">
                {product.stats.totalRevenue.toLocaleString("ko-KR")}원
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">활성 코드 수</p>
              <p className="text-2xl font-bold mt-1">{product.stats.activeCodeCount}개</p>
            </CardContent>
          </Card>
        </div>

        {/* 코드 목록 카드 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">발급된 코드</CardTitle>
            <Button
              size="sm"
              onClick={() => router.push(`/seller/codes/new?productId=${id}`)}
            >
              <Plus className="h-4 w-4 mr-1" />
              코드 추가
            </Button>
          </CardHeader>
          <CardContent>
            {product.codes.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-muted-foreground">발급된 코드가 없습니다.</p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/seller/codes/new?productId=${id}`)}
                >
                  코드 발급하기
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>코드</TableHead>
                    <TableHead>주문수</TableHead>
                    <TableHead>만료일</TableHead>
                    <TableHead>최대/사용</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.codes.map((code) => {
                    const codeStatus = getCodeStatus(code);
                    return (
                      <TableRow
                        key={code.id}
                        className={`cursor-pointer hover:bg-muted/50 ${!code.isActive ? "opacity-60" : ""}`}
                        onClick={() => router.push("/seller/codes/" + code.id)}
                      >
                        <TableCell className="font-mono text-sm">{code.codeKey}</TableCell>
                        <TableCell>{code._count.orders}건</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(code.expiresAt).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell>
                          {code.maxQty === 0 ? "무제한" : `${code.maxQty}`} /{" "}
                          {code.usedQty}
                        </TableCell>
                        <TableCell>
                          <Badge variant={codeStatus.variant}>{codeStatus.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}
