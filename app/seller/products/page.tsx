"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SellerShell from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Pagination from "@/components/ui/Pagination";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  function fetchProducts(currentPage = page) {
    fetch(`/api/seller/products?page=${currentPage}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setProducts(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchProducts(page);
  }, [page]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/seller/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchProducts(page);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SellerShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">상품 관리</h1>
            <p className="text-muted-foreground">등록된 상품을 관리하세요</p>
          </div>
          <Link href="/seller/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 상품 등록
            </Button>
          </Link>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                등록된 상품이 없습니다. 상품을 등록하여 판매를 시작하세요.
              </p>
              <Link href="/seller/products/new">
                <Button className="mt-4">상품 등록하기</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/seller/products/${product.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "판매중" : "중지"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{product.category}</span>
                    <span className="font-semibold">
                      ₩{product.price.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    재고: {product.stock}개
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); router.push(`/seller/products/${product.id}/edit`); }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(product); }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상품 삭제 확인</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.name}&rdquo; 상품을 삭제하시겠습니까?
            <br />
            상품이 비활성화되며 기존 주문에는 영향을 미치지 않습니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerShell>
  );
}
