"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmailVerifyPage() {
  return (
    <Suspense>
      <EmailVerifyContent />
    </Suspense>
  );
}

function EmailVerifyContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const content = {
    success: {
      title: "이메일 인증 완료",
      icon: "✅",
      message: "이메일 인증이 완료되었습니다. 관리자 승인 후 서비스를 이용하실 수 있습니다.",
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
    },
    already: {
      title: "이미 인증된 이메일",
      icon: "ℹ️",
      message: "이미 이메일 인증이 완료된 계정입니다.",
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    invalid: {
      title: "유효하지 않은 링크",
      icon: "❌",
      message: "인증 링크가 유효하지 않거나 만료되었습니다. 로그인 후 인증 메일을 다시 요청해주세요.",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    },
    expired: {
      title: "인증 링크 만료",
      icon: "⏰",
      message: "인증 링크가 만료되었습니다. 24시간이 경과했습니다. 셀러 대시보드에서 인증 메일을 재발송해 주세요.",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
    },
    error: {
      title: "오류 발생",
      icon: "⚠️",
      message: "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
    },
  }[status ?? "invalid"] ?? {
    title: "이메일 인증",
    icon: "📧",
    message: "이메일 인증 처리 중입니다...",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">LIVEORDER</CardTitle>
          <p className="text-sm text-muted-foreground">이메일 인증</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-md border px-4 py-4 ${content.bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{content.icon}</span>
              <div>
                <p className={`font-semibold ${content.color}`}>{content.title}</p>
                <p className={`mt-1 text-sm ${content.color}`}>{content.message}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/seller/auth/login">로그인 페이지로 이동</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
