"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const categories = [
  "패션의류",
  "잡화/소품",
  "뷰티/화장품",
  "식품",
  "생활용품",
  "전자기기",
  "기타",
];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
          price: formData.get("price"),
          stock: formData.get("stock"),
          category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push("/seller/products");
    } catch {
      setError("서버 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <SellerShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">상품 등록</h1>
          <p className="text-muted-foreground">새로운 상품을 등록하세요</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">상품명 *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">상품 설명</Label>
                <Textarea id="description" name="description" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">판매가격 (원) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">재고 수량</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min={0}
                    defaultValue={0}
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
                  {loading ? "등록 중..." : "상품 등록"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
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
