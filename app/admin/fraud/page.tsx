"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldAlert } from "lucide-react";

interface SuspiciousIp {
  buyer_ip: string;
  order_count: number;
  first_at: string;
  last_at: string;
  order_ids: string[];
}

interface SuspiciousPhone {
  buyer_phone: string;
  order_count: number;
  total_amount: number;
  first_at: string;
  last_at: string;
  order_ids: string[];
}

interface FraudData {
  suspiciousIps: SuspiciousIp[];
  suspiciousPhones: SuspiciousPhone[];
}

function maskPhone(phone: string): string {
  // 010-1234-5678 → 010-****-5678
  return phone.replace(/(\d{3})-(\d{3,4})-(\d{4})/, "$1-****-$3");
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function FraudMonitoringPage() {
  const router = useRouter();
  const [data, setData] = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fraud");
      if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAlerts =
    (data?.suspiciousIps.length ?? 0) + (data?.suspiciousPhones.length ?? 0);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold">이상 거래 모니터링</h1>
            {!loading && totalAlerts > 0 && (
              <Badge variant="destructive">{totalAlerts}건 감지</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pattern A: 동일 IP 다수 주문 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              ⚠️ 동일 IP 다수 주문
              <span className="text-sm font-normal text-muted-foreground">
                최근 1시간, 5건 이상
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                로딩 중...
              </div>
            ) : data?.suspiciousIps.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                현재 이상 거래 패턴이 감지되지 않았습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP 주소</TableHead>
                    <TableHead className="text-right">주문 수</TableHead>
                    <TableHead>첫 주문</TableHead>
                    <TableHead>마지막 주문</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.suspiciousIps.map((item) => (
                    <TableRow key={item.buyer_ip}>
                      <TableCell className="font-mono text-sm">
                        {item.buyer_ip}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{item.order_count}건</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(item.first_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(item.last_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/admin/orders?q=${encodeURIComponent(item.buyer_ip)}`
                            )
                          }
                        >
                          주문 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pattern B: 단시간 고액 주문 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              ⚠️ 단시간 고액 주문
              <span className="text-sm font-normal text-muted-foreground">
                최근 30분, 3건↑ + 30만원↑
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                로딩 중...
              </div>
            ) : data?.suspiciousPhones.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                현재 이상 거래 패턴이 감지되지 않았습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>전화번호</TableHead>
                    <TableHead className="text-right">주문 수</TableHead>
                    <TableHead className="text-right">총 금액</TableHead>
                    <TableHead>첫 주문</TableHead>
                    <TableHead>마지막 주문</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.suspiciousPhones.map((item) => (
                    <TableRow key={item.buyer_phone}>
                      <TableCell className="font-mono text-sm">
                        {maskPhone(item.buyer_phone)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{item.order_count}건</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.total_amount.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(item.first_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(item.last_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/admin/orders?q=${encodeURIComponent(item.buyer_phone)}`
                            )
                          }
                        >
                          주문 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
