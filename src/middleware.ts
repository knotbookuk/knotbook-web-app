import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/** Dashboard paths accessible on the free tier. */
const FREE_PATHS = new Set([
  "/dashboard",
  "/dashboard/budget",
  "/dashboard/checklists",
  "/dashboard/settings",
  "/dashboard/subscription",
  "/dashboard/feedback",
  "/dashboard/coming-soon",
]);

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes - require ADMIN role
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Planner routes - only for planner users
    if (path.startsWith("/planner") && token?.userType !== "PLANNER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Dashboard routes for couples - redirect to onboarding if no wedding
    if (path.startsWith("/dashboard") && token?.userType !== "PLANNER" && !token?.hasWedding) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Dashboard routes for planners without a selected wedding - redirect to planner overview
    if (path.startsWith("/dashboard") && token?.userType === "PLANNER" && !token?.weddingId) {
      return NextResponse.redirect(new URL("/planner", req.url));
    }

    // Plan gating — free users can only access FREE_PATHS
    if (path.startsWith("/dashboard") && !FREE_PATHS.has(path) && !token?.plan) {
      return NextResponse.redirect(new URL("/dashboard/subscription", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && !!token.id,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding", "/planner/:path*"],
};
