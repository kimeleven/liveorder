"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

interface Props {
  data: Record<string, unknown>;
}

export default function TrackingUpdate({ data }: Props) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-blue-700">
          <Package className="h-5 w-5" />
          <span className="font-semibold">배송 정보가 등록되었습니다</span>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">택배사: </span>
            {data.carrier as string}
          </p>
          <p>
            <span className="text-muted-foreground">운송장번호: </span>
            <span className="font-mono">{data.trackingNo as string}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
