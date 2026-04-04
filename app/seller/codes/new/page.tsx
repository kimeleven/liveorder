"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SellerShell from "@/components/seller/SellerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import QRCode from "qrcode";

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function NewCodePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    fetch("/api/seller/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/seller/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          expiresInHours: formData.get("expiresInHours"),
          maxQty: formData.get("maxQty"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setGeneratedCode(data.codeKey);
      // Generate QR code for /order/[code] URL
      const orderUrl = `${window.location.origin}/order/${data.codeKey}`;
      QRCode.toDataURL(orderUrl, { width: 256, margin: 2 })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
      setLoading(false);
    } catch {
      setError("서버 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  if (generatedCode) {
    return (
      <SellerShell>
        <div className="max-w-md mx-auto space-y-6 text-center">
          <h1 className="text-2xl font-bold">코드가 발급되었습니다!</h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-mono font-bold tracking-widest">
                {generatedCode}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                라이브 방송 중 이 코드를 구매자에게 공유하세요.
              </p>
              {qrDataUrl && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">QR 코드 스캔으로 바로 주문</p>
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${generatedCode}`}
                    className="w-40 h-40 rounded-lg border"
                  />
                  <a
                    href={qrDataUrl}
                    download={`qr-${generatedCode}.png`}
                    className="text-xs text-primary underline"
                  >
                    QR 이미지 다운로드
                  </a>
                </div>
              )}
              <div className="mt-6 flex gap-3 justify-center">
                <Button
                  onClick={() =>
                    navigator.clipboard.writeText(generatedCode)
                  }
                >
                  코드 복사
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/seller/codes")}
                >
                  코드 목록
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SellerShell>
    );
  }

  return (
    <SellerShell>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">코드 발급</h1>
          <p className="text-muted-foreground">
            상품에 연결된 주문 코드를 생성합니다
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>상품 선택 *</Label>
                <Select value={productId} onValueChange={(v) => setProductId(v ?? "")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="상품을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (₩{p.price.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiresInHours">유효기간 (시간)</Label>
                  <Input
                    id="expiresInHours"
                    name="expiresInHours"
                    type="number"
                    min={1}
                    max={72}
                    defaultValue={24}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxQty">최대 수량 (0=무제한)</Label>
                  <Input
                    id="maxQty"
                    name="maxQty"
                    type="number"
                    min={0}
                    defaultValue={0}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading || !productId}>
                  {loading ? "발급 중..." : "코드 발급"}
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
