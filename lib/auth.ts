import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "seller-login",
      name: "Seller",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const seller = await prisma.seller.findUnique({
          where: { email: credentials.email as string },
        });
        if (!seller) return null;

        const isValid = await compare(
          credentials.password as string,
          seller.password
        );
        if (!isValid) return null;

        return {
          id: seller.id,
          email: seller.email,
          name: seller.name,
          role: "seller" as const,
          status: seller.status,
        };
      },
    }),
    Credentials({
      id: "admin-login",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email as string },
        });
        if (!admin) return null;

        const isValid = await compare(
          credentials.password as string,
          admin.password
        );
        if (!isValid) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: "admin" as const,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        if ("status" in user) {
          token.sellerStatus = (user as { status: string }).status;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        if (token.sellerStatus) {
          (session.user as { sellerStatus: string }).sellerStatus =
            token.sellerStatus as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/seller/auth/login",
  },
  session: {
    strategy: "jwt",
  },
});
