"use client";

import { useEffect, useState } from "react";
import SellerShell from "@/components/seller/SellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, QrCode, ShoppingCart, Wallet } from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  activeCodes: number;
  totalOrders: number;
  pendingSettlement: number;
  sellerStatus?: string;
}

export default function SellerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeCodes: 0,
    totalOrders: 0,
    pendingSettlement: 0,
  });

  useEffect(() => {
    fetch("/api/seller/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const cards = [
    {
      title: "등록 상품",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "활성 코드",
      value: stats.activeCodes,
      icon: QrCode,
      color: "text-green-600",
    },
    {
      title: "총 주문",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-orange-600",
    },
    {
      title: "정산 대기",
      value: `₩${stats.pendingSettlement.toLocaleString()}`,
      icon: Wallet,
      color: "text-purple-600",
    },
  ];

  return (
    <SellerShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">판매 현황을 한눈에 확인하세요</p>
        </div>

        {stats.sellerStatus === "PENDING" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            <p className="font-medium">승인 대기 중</p>
            <p className="text-sm">관리자 승인 후 상품 등록 및 코드 발급이 가능합니다.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최근 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              아직 주문이 없습니다. 상품을 등록하고 코드를 발급하여 판매를 시작하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}
