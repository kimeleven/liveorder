"use client";

import { useState } from "react";
import Image from "next/image";
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
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlus, X } from "lucide-react";

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
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/seller/products/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "이미지 업로드에 실패했습니다.");
        return;
      }
      setImageUrl(data.url);
      setImagePreview(data.url);
    } catch {
      setError("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setImageUploading(false);
    }
  }

  const [categoryError, setCategoryError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!category) {
      setCategoryError("카테고리를 선택해 주세요.");
      return;
    }
    setCategoryError("");
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
          imageUrl: imageUrl || null,
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
              {/* 상품 이미지 */}
              <div className="space-y-2">
                <Label>상품 이미지</Label>
                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
                    <Image
                      src={imagePreview}
                      alt="상품 이미지"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageUrl(""); setImagePreview(""); }}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {imageUploading ? "업로드 중..." : "이미지 선택 (JPG, PNG, WebP, 5MB 이하)"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={imageUploading}
                    />
                  </label>
                )}
              </div>

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
                <Select value={category} onValueChange={(v) => { setCategory(v ?? ""); setCategoryError(""); }}>
                  <SelectTrigger className={categoryError ? "border-destructive" : ""}>
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
                {categoryError && <p className="text-sm text-destructive">{categoryError}</p>}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading || imageUploading}>
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
