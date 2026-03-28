import "next-auth";

declare module "next-auth" {
  interface User {
    role: "seller" | "admin";
    status?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "seller" | "admin";
      sellerStatus?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "seller" | "admin";
    sellerStatus?: string;
  }
}
