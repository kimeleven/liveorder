"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface RefundDialogProps {
  order: {
    id: string;
    amount: number;
    buyerName: string;
    productName: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundDialog({
  order,
  isOpen,
  onClose,
  onSuccess,
}: RefundDialogProps) {
  const [reason, setReason] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefund() {
    if (reason.trim().length < 5) {
      setError("환불 사유를 5자 이상 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    const body: { reason: string; amount?: number } = { reason: reason.trim() };
    if (partialAmount) {
      const parsed = parseInt(partialAmount, 10);
      if (isNaN(parsed) || parsed <= 0 || parsed > order.amount) {
        setError(`환불 금액은 1 ~ ${order.amount.toLocaleString()}원 사이로 입력해주세요.`);
        setLoading(false);
        return;
      }
      body.amount = parsed;
    }

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "환불 처리에 실패했습니다.");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setReason("");
    setPartialAmount("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>환불 처리</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">상품:</span>{" "}
              <span className="font-medium">{order.productName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">구매자:</span>{" "}
              <span className="font-medium">{order.buyerName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">결제금액:</span>{" "}
              <span className="font-medium">₩{order.amount.toLocaleString()}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              환불 사유 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="환불 사유를 5자 이상 입력해주세요."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partialAmount">
              부분 환불 금액{" "}
              <span className="text-muted-foreground text-xs">(미입력 시 전액 환불)</span>
            </Label>
            <Input
              id="partialAmount"
              type="number"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder={`최대 ${order.amount.toLocaleString()}원`}
              min={1}
              max={order.amount}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleRefund} disabled={loading}>
            {loading ? "처리 중..." : "환불 처리"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
