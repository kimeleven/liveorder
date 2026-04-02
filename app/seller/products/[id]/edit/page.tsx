"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import SellerShell from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  "패션의류",
  "잡화/소품",
  "뷰티/화장품",
  "식품",
  "생활용품",
  "전자기기",
  "기타",
];

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  isActive: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  useEffect(() => {
    fetch(`/api/seller/products/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProduct(data);
          setName(data.name);
          setDescription(data.description ?? "");
          setPrice(String(data.price));
          setStock(String(data.stock));
          setCategory(data.category);
        }
      })
      .catch(() => setError("상품 정보를 불러오지 못했습니다."))
      .finally(() => setFetchLoading(false));
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/seller/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, price, stock, category }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "수정에 실패했습니다.");
        setLoading(false);
        return;
      }

      router.push("/seller/products");
    } catch {
      setError("서버 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  if (fetchLoading) {
    return (
      <SellerShell>
        <p className="text-muted-foreground">불러오는 중...</p>
      </SellerShell>
    );
  }

  if (!product && error) {
    return (
      <SellerShell>
        <p className="text-destructive">{error}</p>
      </SellerShell>
    );
  }

  return (
    <SellerShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">상품 수정</h1>
          <p className="text-muted-foreground">상품 정보를 수정하세요</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">상품명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">상품 설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">판매가격 (원) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={100}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">재고 수량</Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>카테고리 *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v ?? "")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "저장 중..." : "수정 완료"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/seller/products")}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}
