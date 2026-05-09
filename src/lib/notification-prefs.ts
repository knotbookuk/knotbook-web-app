import { prisma } from "@/lib/prisma";

export interface NotificationPrefs {
  emailRsvp: boolean;
  emailPayment: boolean;
  emailTasks: boolean;
  emailEvents: boolean;
  emailBudget: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  emailRsvp: true,
  emailPayment: false,
  emailTasks: false,
  emailEvents: false,
  emailBudget: false,
};

export async function getUserNotifPrefs(userId: string): Promise<NotificationPrefs> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  if (!user?.notificationPrefs) return { ...DEFAULT_PREFS };

  const stored = user.notificationPrefs as Partial<NotificationPrefs>;
  return { ...DEFAULT_PREFS, ...stored };
}
