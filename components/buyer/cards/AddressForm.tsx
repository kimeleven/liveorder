"use client";

import { useState } from "react";
import { useBuyerStore } from "@/stores/buyer-store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  data: Record<string, unknown>;
}

export default function AddressForm({ data }: Props) {
  const { currentFlow, updateFlowStep, addMessage, setPhoneNumber } =
    useBuyerStore();
  const isInteractive = currentFlow?.step === "quantity_selected";
  const [agreePersonal, setAgreePersonal] = useState(false);
  const [agreeThirdParty, setAgreeThirdParty] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const buyerPhone = formData.get("buyerPhone") as string;
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(buyerPhone)) {
      setPhoneError("올바른 휴대폰 번호를 입력해 주세요 (예: 010-1234-5678)");
      return;
    }
    setPhoneError("");
    setSubmitError("");

    const address = {
      buyerName: formData.get("buyerName") as string,
      buyerPhone,
      address: formData.get("address") as string,
      addressDetail: formData.get("addressDetail") as string,
      memo: formData.get("memo") as string,
    };

    setPhoneNumber(address.buyerPhone);

    addMessage({
      direction: "outgoing",
      type: "text",
      payload: { text: `배송지: ${address.buyerName} / ${address.address}` },
    });

    updateFlowStep("address_entry", { address });

    // 주문 생성 API 호출
    setSubmitting(true);
    try {
      const totalAmount = data.totalAmount as number;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeId: currentFlow?.codeId,
          buyerName: address.buyerName,
          buyerPhone: address.buyerPhone,
          address: address.address,
          addressDetail: address.addressDetail,
          memo: address.memo,
          quantity: data.quantity,
          amount: totalAmount,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setSubmitError(result.error || "주문 생성에 실패했습니다.");
        return;
      }

      const sellerPayment = result.sellerPayment ?? {};
      updateFlowStep("transfer_pending", { orderId: result.id });
      addMessage({
        direction: "incoming",
        type: "transfer-options",
        payload: {
          orderId: result.id,
          bank: sellerPayment.bankName ?? "",
          accountNo: sellerPayment.bankAccount ?? "",
          amount: totalAmount,
          kakaoPayId: sellerPayment.kakaoPayId ?? null,
          productName: currentFlow?.product?.name ?? "",
          quantity: data.quantity,
        },
      });
    } catch {
      setSubmitError("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-medium">배송 정보를 입력해주세요</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="buyerName" className="text-xs">수령인 *</Label>
              <Input
                id="buyerName"
                name="buyerName"
                required
                disabled={!isInteractive}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="buyerPhone" className="text-xs">연락처 *</Label>
              <Input
                id="buyerPhone"
                name="buyerPhone"
                type="tel"
                placeholder="010-1234-5678"
                required
                disabled={!isInteractive}
                className={`h-9${phoneError ? " border-destructive" : ""}`}
                onChange={() => setPhoneError("")}
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs">주소 *</Label>
            <Input
              id="address"
              name="address"
              required
              disabled={!isInteractive}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="addressDetail" className="text-xs">상세주소</Label>
            <Input
              id="addressDetail"
              name="addressDetail"
              disabled={!isInteractive}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="memo" className="text-xs">배송 메모</Label>
            <Textarea
              id="memo"
              name="memo"
              rows={2}
              disabled={!isInteractive}
              className="text-sm"
            />
          </div>

          {isInteractive && (
            <>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreePersonal}
                    onChange={(e) => setAgreePersonal(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    [필수] 개인정보 수집·이용 동의 (이름, 연락처, 주소를
                    주문처리 및 배송 목적으로 수집하며 거래 후 5년간 보관합니다)
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreeThirdParty}
                    onChange={(e) => setAgreeThirdParty(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    [필수] 개인정보 제3자 제공 동의 (수령인명, 배송주소, 연락처를
                    판매자에게 배송 처리 목적으로 제공합니다)
                  </span>
                </label>
              </div>
              {submitError && (
                <p className="text-xs text-destructive">{submitError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={!agreePersonal || !agreeThirdParty || submitting}
              >
                {submitting ? "주문 생성 중..." : "배송정보 확인"}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
