import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { getUserNotifPrefs } from "@/lib/notification-prefs";
import { formatCurrency } from "@/lib/format";
import { createLogger } from "@/lib/logger";

const log = createLogger("budget-alerts");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

/**
 * Re-evaluate budget alert thresholds for a wedding after any mutation that
 * affects either total spend (budget item POST/PATCH/DELETE) or total budget
 * (wedding settings PATCH).
 *
 * Algorithm:
 *  - Compute `percentUsed = round(sum(actualCost) / totalBudget * 100)`.
 *  - From the wedding's configured thresholds, compute the set currently
 *    crossed (`trippedNow`) and the subset that haven't been emailed yet
 *    (`newlyTripped`).
 *  - If anything is newly tripped and `emailBudget` pref is on, send ONE
 *    digest email with the live percent (covers the "0% → 95% in one move"
 *    case without sending three separate 80/90/100 emails).
 *  - Persist `budgetAlertsSent = trippedNow`. This is the key trick: the
 *    state always mirrors current truth, so dropping below a threshold
 *    naturally untrips it and a future re-cross is a legitimate new alert.
 *
 * Edge cases handled:
 *  - totalBudget == 0 (or null): clear state, never divide by zero.
 *  - emailBudget pref off: still keep state in sync, just don't send.
 *  - User has no email/account: fail closed silently.
 *  - Errors here never bubble up to the caller — alerting is best-effort
 *    and must not block the underlying mutation.
 */
export async function recheckBudgetAlerts(weddingId: string): Promise<void> {
  try {
    const [items, wedding] = await Promise.all([
      prisma.budgetItem.findMany({
        where: { weddingId },
        select: { actualCost: true },
      }),
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: {
          totalBudget: true,
          budgetAlertsSent: true,
          budgetAlertThresholds: true,
          userId: true,
        },
      }),
    ]);

    if (!wedding) return;

    const totalBudget = Number(wedding.totalBudget);
    const alertsSent = (wedding.budgetAlertsSent as number[]) || [];

    // Zero/missing budget — alerts are meaningless; just clear state so a
    // future budget assignment starts from a clean slate.
    if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
      if (alertsSent.length > 0) {
        await prisma.wedding.update({
          where: { id: weddingId },
          data: { budgetAlertsSent: [] },
        });
      }
      return;
    }

    const totalSpent = items.reduce((s, i) => s + Number(i.actualCost), 0);
    const percentUsed = Math.round((totalSpent / totalBudget) * 100);

    const thresholds = (wedding.budgetAlertThresholds || [80, 90, 100])
      .filter((t) => Number.isFinite(t) && t > 0 && t <= 1000)
      .sort((a, b) => a - b);

    const trippedNow = thresholds.filter((t) => percentUsed >= t);
    const newlyTripped = trippedNow.filter((t) => !alertsSent.includes(t));

    // Only persist if something actually changed — avoids spurious DB writes
    // on every read-only operation that calls this helper.
    const sameSet =
      trippedNow.length === alertsSent.length &&
      trippedNow.every((t) => alertsSent.includes(t));

    if (newlyTripped.length > 0) {
      const user = await prisma.user.findUnique({
        where: { id: wedding.userId },
        select: { id: true, email: true, name: true },
      });
      if (user) {
        const prefs = await getUserNotifPrefs(user.id);
        if (prefs.emailBudget) {
          // Best-effort send — failure must not abort state update.
          sendEmail({
            to: user.email,
            slug: "budget-alert",
            variables: {
              name: user.name,
              totalBudget: formatCurrency(totalBudget),
              totalSpent: formatCurrency(totalSpent),
              percentUsed: String(percentUsed),
              dashboardUrl: `${APP_URL}/dashboard/budget`,
            },
            recipientName: user.name,
          }).catch((err) => {
            log.error("Budget alert email failed", {
              weddingId,
              error: (err as Error).message,
            });
          });
        }
      }
    }

    if (!sameSet) {
      await prisma.wedding.update({
        where: { id: weddingId },
        data: { budgetAlertsSent: trippedNow },
      });
    }
  } catch (err) {
    // Never let alert failures break the underlying mutation.
    log.error("recheckBudgetAlerts failed", {
      weddingId,
      error: (err as Error).message,
    });
  }
}
