import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { employee: true },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        if (user.employee && user.employee.status === "INACTIVE") return null;
        return {
          id: user.id,
          email: user.email,
          name: user.employee?.fullName ?? user.email,
          role: user.role,
          employeeId: user.employeeId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.employeeId = (user as any).employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.employeeId = (token.employeeId as string | null) ?? null;
      }
      return session;
    },
  },
};

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  employeeId: string | null;
};

/** Lấy user hiện tại, bắt buộc đăng nhập; nếu truyền roles thì kiểm tra quyền */
export async function requireUser(roles?: string[]): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export const CAN_MANAGE_HR = ["ADMIN", "HR"];
export const CAN_APPROVE = ["ADMIN", "HR", "MANAGER"];
