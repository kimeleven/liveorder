"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
      repName: formData.get("repName"),
      businessNo: formData.get("businessNo"),
      tradeRegNo: formData.get("tradeRegNo"),
      address: formData.get("address"),
      phone: formData.get("phone"),
      bankName: formData.get("bankName"),
      bankAccount: formData.get("bankAccount"),
    };

    const confirmPassword = formData.get("confirmPassword");
    if (data.password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/sellers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/seller/auth/login?registered=true");
    } catch {
      setError("서버 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">셀러 등록</CardTitle>
          <p className="text-sm text-muted-foreground">
            사업자 정보를 입력하여 LIVEORDER 셀러로 등록하세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">상호명 *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repName">대표자명 *</Label>
                <Input id="repName" name="repName" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessNo">사업자등록번호 *</Label>
                <Input
                  id="businessNo"
                  name="businessNo"
                  placeholder="000-00-00000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradeRegNo">통신판매업신고번호</Label>
                <Input id="tradeRegNo" name="tradeRegNo" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">사업장 주소 *</Label>
              <Input id="address" name="address" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">연락처 *</Label>
                <Input id="phone" name="phone" type="tel" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">정산 은행명</Label>
                <Input id="bankName" name="bankName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount">정산 계좌번호</Label>
                <Input id="bankAccount" name="bankAccount" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "등록 중..." : "셀러 등록 신청"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
            <Link href="/seller/auth/login" className="text-primary underline">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
