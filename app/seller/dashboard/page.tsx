"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import SellerShell from "@/components/seller/SellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, QrCode, ShoppingCart, Wallet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RecentOrder {
  id: string;
  buyerName: string;
  amount: number;
  status: string;
  createdAt: string;
  code: { product: { name: string } };
}

interface DashboardStats {
  totalProducts: number;
  activeCodes: number;
  totalOrders: number;
  pendingSettlement: number;
  sellerStatus?: string;
  emailVerified?: boolean;
  recentOrders?: RecentOrder[];
  dailySales?: { date: string; total: number }[];
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAID: "결제완료",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  SETTLED: "정산완료",
  REFUNDED: "환불",
};

export default function SellerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeCodes: 0,
    totalOrders: 0,
    pendingSettlement: 0,
  });
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    fetch("/api/seller/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  async function checkApprovalStatus() {
    setCheckLoading(true);
    setCheckMessage(null);
    try {
      const res = await fetch("/api/seller/me");
      const data = await res.json();
      if (data.status === "APPROVED") {
        await signOut({ callbackUrl: "/seller/auth/login?message=approved" });
      } else {
        setCheckMessage("아직 승인 대기 중입니다. 관리자에게 문의하세요.");
      }
    } catch {
      setCheckMessage("확인 중 오류가 발생했습니다.");
    } finally {
      setCheckLoading(false);
    }
  }

  async function resendVerificationEmail() {
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/seller/me");
      const me = await res.json();
      const r = await fetch("/api/seller/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: me.email }),
      });
      const data = await r.json();
      if (r.ok) {
        setResendMessage("인증 메일을 발송했습니다. 받은 편지함을 확인해주세요.");
      } else {
        setResendMessage(data.error || "발송 중 오류가 발생했습니다.");
      }
    } catch {
      setResendMessage("발송 중 오류가 발생했습니다.");
    } finally {
      setResendLoading(false);
    }
  }

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

        {stats.emailVerified === false && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
            <p className="font-medium">이메일 인증이 필요합니다</p>
            <p className="text-sm">가입 시 발송된 인증 메일을 확인하여 이메일 인증을 완료해주세요.</p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-blue-400 text-blue-800 hover:bg-blue-100"
                onClick={resendVerificationEmail}
                disabled={resendLoading}
              >
                {resendLoading ? "발송 중..." : "인증 메일 재발송"}
              </Button>
              {resendMessage && (
                <p className="text-sm text-blue-700">{resendMessage}</p>
              )}
            </div>
          </div>
        )}

        {stats.sellerStatus === "PENDING" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            <p className="font-medium">승인 대기 중</p>
            <p className="text-sm">관리자 승인 후 상품 등록 및 코드 발급이 가능합니다.</p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                onClick={checkApprovalStatus}
                disabled={checkLoading}
              >
                {checkLoading ? "확인 중..." : "승인 확인"}
              </Button>
              {checkMessage && (
                <p className="text-sm text-yellow-700">{checkMessage}</p>
              )}
            </div>
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

        {stats.dailySales && stats.dailySales.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">최근 7일 매출</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.dailySales}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v: number) =>
                      v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number) => [`₩${v.toLocaleString()}`, '매출']}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최근 주문</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders && stats.recentOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문번호</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>날짜</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-sm">{order.code.product.name}</TableCell>
                      <TableCell className="text-sm">₩{order.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                아직 주문이 없습니다. 상품을 등록하고 코드를 발급하여 판매를 시작하세요.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerShell>
  );
}
