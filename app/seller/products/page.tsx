"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SellerShell from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

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
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/seller/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => {});
  }, []);

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
              <Link key={product.id} href={`/seller/products/${product.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SellerShell>
  );
}
