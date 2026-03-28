import { SessionProvider } from "next-auth/react";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
