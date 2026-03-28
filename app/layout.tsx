import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIVEORDER - 라이브커머스 주문·결제 플랫폼",
  description:
    "코드 하나로 라이브커머스 주문과 결제를 간편하게. 셀러와 구매자 모두의 편의를 극대화합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
