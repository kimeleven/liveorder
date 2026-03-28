"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Wallet, AlertTriangle } from "lucide-react";

interface AdminStats {
  pendingSellers: number;
  totalOrders: number;
  pendingSettlements: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    pendingSellers: 0,
    totalOrders: 0,
    pendingSettlements: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const cards = [
    { title: "승인 대기 셀러", value: stats.pendingSellers, icon: Users, color: "text-orange-600" },
    { title: "총 주문", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-600" },
    { title: "정산 대기", value: stats.pendingSettlements, icon: Wallet, color: "text-purple-600" },
    { title: "총 수수료 수입", value: `₩${stats.totalRevenue.toLocaleString()}`, icon: AlertTriangle, color: "text-green-600" },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
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
      </div>
    </AdminShell>
  );
}
