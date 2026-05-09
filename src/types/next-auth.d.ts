import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "USER" | "ADMIN";
      userType: "COUPLE" | "PLANNER";
      hasWedding: boolean;
      weddingId: string | null;
      plan: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    userType: "COUPLE" | "PLANNER";
    hasWedding: boolean;
    weddingId: string | null;
    plan: string | null;
  }
}
