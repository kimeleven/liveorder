"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SellerProfile = {
  name: string;
  email: string;
  repName: string;
  businessNo: string;
  phone: string;
  address: string;
  bankAccount: string | null;
  bankName: string | null;
  tradeRegNo: string | null;
  shopCode: string | null;
  kakaoPayId: string | null;
  plan: string;
  createdAt: string;
  status: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [tradeRegNo, setTradeRegNo] = useState("");
  const [shopCode, setShopCode] = useState("");
  const [kakaoPayId, setKakaoPayId] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    fetch("/api/seller/me")
      .then((r) => r.json())
      .then((data: SellerProfile) => {
        setProfile(data);
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setBankAccount(data.bankAccount ?? "");
        setBankName(data.bankName ?? "");
        setTradeRegNo(data.tradeRegNo ?? "");
        setShopCode(data.shopCode ?? "");
        setKakaoPayId(data.kakaoPayId ?? "");
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/seller/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address, bankAccount, bankName, tradeRegNo, shopCode, kakaoPayId }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setSaveMsg("저장되었습니다.");
    } catch {
      setSaveMsg("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (newPw !== confirmPw) {
      setPwMsg("비밀번호가 일치하지 않습니다.");
      return;
    }
    setChangingPw(true);
    setPwMsg("");
    try {
      const res = await fetch("/api/seller/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "변경 실패");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg("비밀번호가 변경되었습니다.");
    } catch (e: unknown) {
      setPwMsg(e instanceof Error ? e.message : "변경에 실패했습니다.");
    } finally {
      setChangingPw(false);
    }
  }

  const isErrorMsg = (msg: string) =>
    msg.includes("실패") || msg.includes("않") || msg.includes("올바");

  if (!profile)
    return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">설정</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 기본 정보 (읽기 전용) */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(
              [
                ["상호명", profile.name],
                ["이메일", profile.email],
                ["대표자명", profile.repName],
                ["사업자번호", profile.businessNo],
                ["플랜", profile.plan],
                [
                  "가입일",
                  new Date(profile.createdAt).toLocaleDateString("ko-KR"),
                ],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 연락처 / 정산 계좌 수정 */}
        <Card>
          <CardHeader>
            <CardTitle>연락처 / 정산 계좌</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>연락처</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
            <div className="space-y-1">
              <Label>주소</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>은행명</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="국민은행"
              />
            </div>
            <div className="space-y-1">
              <Label>계좌번호</Label>
              <Input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="123456789012"
              />
            </div>
            <div className="space-y-1">
              <Label>통신판매업신고번호</Label>
              <Input
                value={tradeRegNo}
                onChange={(e) => setTradeRegNo(e.target.value)}
                placeholder="2024-서울강남-1234"
              />
            </div>
            {saveMsg && (
              <p
                className={`text-sm ${isErrorMsg(saveMsg) ? "text-red-500" : "text-green-600"}`}
              >
                {saveMsg}
              </p>
            )}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "저장 중..." : "저장"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* shopCode + 카카오페이 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 링크 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label>
              shopCode{" "}
              <span className="text-xs text-muted-foreground">(영소문자+숫자 6자리)</span>
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value.toLowerCase())}
                placeholder="abc123"
                maxLength={6}
                className="font-mono"
              />
              {shopCode && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  /s/{shopCode}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              구매자가 이 링크로 접속합니다. 변경 시 기존 링크가 무효화됩니다.
            </p>
          </div>
          <div className="space-y-1">
            <Label>
              카카오페이 ID{" "}
              <span className="text-xs text-muted-foreground">(선택 — QR 결제 활성화)</span>
            </Label>
            <Input
              value={kakaoPayId}
              onChange={(e) => setKakaoPayId(e.target.value)}
              placeholder="kakaopay_id"
            />
            <p className="text-xs text-muted-foreground">
              입력 시 구매자에게 카카오페이 QR이 표시됩니다.
            </p>
          </div>
          <div className="space-y-1">
            <Label>
              은행명 <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-amber-600">
              송금 방식 결제를 위해 은행명과 계좌번호를 반드시 입력하세요.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label>현재 비밀번호</Label>
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>새 비밀번호 (8자 이상)</Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>새 비밀번호 확인</Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
          </div>
          {pwMsg && (
            <p
              className={`text-sm ${isErrorMsg(pwMsg) ? "text-red-500" : "text-green-600"}`}
            >
              {pwMsg}
            </p>
          )}
          <Button
            onClick={handlePasswordChange}
            disabled={changingPw || !currentPw || !newPw || !confirmPw}
            variant="outline"
          >
            {changingPw ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
