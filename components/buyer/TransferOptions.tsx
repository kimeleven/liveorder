"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { tosSendLink, kakaoPayQrUrl } from "@/lib/transfer-links";

interface TransferOptionsProps {
  orderId: string;
  bank: string;
  accountNo: string;
  amount: number;
  kakaoPayId?: string | null;
  onConfirmed: () => void;
}

export default function TransferOptions({
  orderId,
  bank,
  accountNo,
  amount,
  kakaoPayId,
  onConfirmed,
}: TransferOptionsProps) {
  const [tossQr, setTossQr] = useState<string>("");
  const [kakaoQr, setKakaoQr] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const tossUrl = tosSendLink(bank, accountNo, amount);
    QRCode.toDataURL(tossUrl, { width: 160, margin: 1 }).then(setTossQr).catch(() => {});

    if (kakaoPayId) {
      const kakaoUrl = kakaoPayQrUrl(kakaoPayId, amount);
      QRCode.toDataURL(kakaoUrl, { width: 160, margin: 1 }).then(setKakaoQr).catch(() => {});
    }
  }, [bank, accountNo, amount, kakaoPayId]);

  async function handleCopy() {
    await navigator.clipboard.writeText(accountNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "PATCH",
      });
      if (res.ok) {
        onConfirmed();
      }
    } finally {
      setConfirming(false);
    }
  }

  const tossUrl = tosSendLink(bank, accountNo, amount);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <p className="text-sm font-medium">송금 방법을 선택하세요</p>

        {/* 토스 */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">토스</p>
          <div className="flex gap-3 items-start">
            {tossQr && (
              <img src={tossQr} alt="토스 QR" width={80} height={80} className="rounded border" />
            )}
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm"
              onClick={() => window.open(tossUrl, "_blank")}
            >
              토스로 송금하기
            </Button>
          </div>
        </div>

        {/* 카카오페이 */}
        {kakaoPayId && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-semibold">카카오페이</p>
            <div className="flex gap-3 items-start">
              {kakaoQr && (
                <img src={kakaoQr} alt="카카오페이 QR" width={80} height={80} className="rounded border" />
              )}
              <Button
                variant="outline"
                className="flex-1 h-10 text-sm"
                onClick={() => window.open(kakaoPayQrUrl(kakaoPayId, amount), "_blank")}
              >
                카카오페이로 송금
              </Button>
            </div>
          </div>
        )}

        {/* 계좌이체 폴백 */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">계좌이체</p>
          <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-sm">
            <span className="flex-1">
              {bank} {accountNo}
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleCopy}>
              {copied ? "복사됨" : "복사"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            송금액: ₩{amount.toLocaleString()}
          </p>
        </div>

        {/* 송금 완료 버튼 */}
        <Button
          className="w-full h-12 text-base"
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirming ? "처리 중..." : "송금 완료했어요"}
        </Button>
      </CardContent>
    </Card>
  );
}
