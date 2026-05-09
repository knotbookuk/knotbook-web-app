import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSessionInvalidated } from "@/lib/session-invalidation";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          log.warn("Login attempt with missing credentials");
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        log.debug("Login attempt", { email });

        const user = await prisma.user.findUnique({
          where: { email },
          include: { subscription: true, weddings: { take: 1 } },
        });

        if (!user) {
          log.warn("Login failed - no account", { email });
          throw new Error("No account found with this email");
        }

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) {
          log.warn("Login failed - wrong password", { email });
          throw new Error("Incorrect password");
        }

        log.info("Login successful", { userId: user.id, email });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          userType: user.userType,
          hasWedding: user.weddings.length > 0,
          weddingId: user.weddings[0]?.id ?? null,
          plan: user.subscription?.plan ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as { id: string; role: string; userType: string; hasWedding: boolean; weddingId: string | null; plan: string | null };
        token.id = u.id;
        token.role = u.role as "USER" | "ADMIN";
        token.userType = u.userType as "COUPLE" | "PLANNER";
        token.hasWedding = u.hasWedding;
        token.weddingId = u.weddingId;
        token.plan = u.plan ?? null;
        token._lastVerified = Date.now();
      }

      // Re-fetch user data when session is updated (e.g. after creating wedding,
      // editing profile name, granting/revoking admin, etc.)
      if (trigger === "update") {
        log.debug("JWT update triggered, re-fetching user data", { userId: token.id });
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: { subscription: true, weddings: { take: 1, orderBy: { updatedAt: 'desc' } } },
        });
        if (freshUser) {
          token.name = freshUser.name;
          token.email = freshUser.email;
          token.userType = freshUser.userType as "COUPLE" | "PLANNER";
          if (freshUser.userType === "PLANNER" && freshUser.activeWeddingId) {
            token.weddingId = freshUser.activeWeddingId;
            token.hasWedding = true;
          } else {
            token.hasWedding = freshUser.weddings.length > 0;
            token.weddingId = freshUser.weddings[0]?.id ?? null;
          }
          token.plan = freshUser.subscription?.plan ?? null;
          token.role = freshUser.role as "USER" | "ADMIN";
          token._lastVerified = Date.now();
          log.info("JWT refreshed", { userId: token.id, hasWedding: token.hasWedding, weddingId: token.weddingId });
        }
      }

      // If user has no plan in JWT, check DB on every request.
      // This catches the post-checkout window where webhook has written
      // the subscription but JWT hasn't been refreshed yet.
      // Once plan is set, this check stops running (plan won't be null).
      if (token.id && !token.plan) {
        const sub = await prisma.subscription.findUnique({
          where: { userId: token.id as string },
          select: { plan: true, status: true },
        });
        if (sub && sub.status === "ACTIVE") {
          token.plan = sub.plan;
          log.info("Plan detected from DB (post-checkout catch-up)", { userId: token.id, plan: sub.plan });
        }
      }

      // Instant session invalidation check (in-memory, no DB hit)
      if (token.id && isSessionInvalidated(token.id as string)) {
        log.warn("Session invalidated — user was deleted", { userId: token.id });
        token.id = "";
        token._deleted = true;
        return token;
      }

      // Periodic DB existence check (every 5 minutes) — catches deleted users
      // even after server restarts when in-memory invalidation is lost. Also
      // re-syncs plan so admin-granted/revoked comp subscriptions propagate
      // without forcing the user to log out.
      const VERIFY_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const lastVerified = (token._lastVerified as number) || 0;
      if (token.id && Date.now() - lastVerified > VERIFY_INTERVAL) {
        const userRow = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            subscription: { select: { plan: true, status: true } },
          },
        });
        if (!userRow) {
          log.warn("User no longer exists in DB — invalidating session", { userId: token.id });
          token.id = "";
          token._deleted = true;
          return token;
        }
        token.plan =
          userRow.subscription?.status === "ACTIVE"
            ? userRow.subscription.plan
            : null;
        token._lastVerified = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      // If token was invalidated (user deleted), strip user data so API routes reject
      if (!token.id) {
        session.user = { id: "", email: "", name: "", role: "USER" as const, userType: "COUPLE" as const, hasWedding: false, weddingId: null, plan: null };
        return session;
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.userType = token.userType;
        session.user.hasWedding = token.hasWedding;
        session.user.weddingId = token.weddingId;
        session.user.plan = token.plan;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
