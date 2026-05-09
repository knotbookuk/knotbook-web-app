/**
 * Plan tier helpers for subscription gating.
 *
 * FREE features: Dashboard, Budget, Checklists, Settings, Subscription, Feedback, Coming Soon
 * Everything else requires a paid plan.
 */

export type PlanTier = "free" | "couple" | "planner_basic" | "planner_advanced" | "legacy";

/** Map a raw PlanType enum value to a simplified tier. */
export function getPlanTier(plan: string | null | undefined): PlanTier {
  if (!plan) return "free";

  switch (plan) {
    case "COUPLE_MONTHLY":
    case "COUPLE_YEARLY":
      return "couple";
    case "PLANNER_BASIC_MONTHLY":
    case "PLANNER_BASIC_YEARLY":
      return "planner_basic";
    case "PLANNER_ADVANCED_MONTHLY":
    case "PLANNER_ADVANCED_YEARLY":
      return "planner_advanced";
    // Legacy plans from before the pricing overhaul
    case "MONTHLY":
    case "LIFETIME":
      return "legacy";
    default:
      return "free";
  }
}

/** Dashboard paths that are always accessible (even on the free tier). */
export const FREE_PATHS = new Set([
  "/dashboard",
  "/dashboard/budget",
  "/dashboard/checklists",
  "/dashboard/settings",
  "/dashboard/subscription",
  "/dashboard/feedback",
  "/dashboard/coming-soon",
]);

/** Check whether a given dashboard path is allowed for the user's plan. */
export function isFeatureAllowed(plan: string | null | undefined, path: string): boolean {
  if (FREE_PATHS.has(path)) return true;
  const tier = getPlanTier(plan);
  return tier !== "free";
}

/** Human-readable label for the sidebar / profile badge. */
export function getPlanLabel(plan: string | null | undefined): string {
  switch (plan) {
    case "COUPLE_MONTHLY":
      return "Personal Monthly";
    case "COUPLE_YEARLY":
      return "Personal Yearly";
    case "PLANNER_BASIC_MONTHLY":
    case "PLANNER_BASIC_YEARLY":
      return "Planner Basic";
    case "PLANNER_ADVANCED_MONTHLY":
    case "PLANNER_ADVANCED_YEARLY":
      return "Planner Advanced";
    case "MONTHLY":
      return "Monthly Member";
    case "LIFETIME":
      return "Lifetime Member";
    default:
      return "Free";
  }
}
