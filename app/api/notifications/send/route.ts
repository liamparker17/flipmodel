import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";
import { sendEmail, budgetAlertEmail, milestoneOverdueEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("notifications:write");

    // Find unread notifications for the org
    const notifications = await prisma.notification.findMany({
      where: { orgId: ctx.orgId, read: false },
      include: { user: { select: { email: true, name: true } } },
      take: 50,
    });

    if (notifications.length === 0) {
      return apiSuccess({ sent: 0, message: "No pending notifications" });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const notif of notifications) {
      if (!notif.user.email) continue;

      let emailMsg;
      switch (notif.type) {
        case "budget_alert":
          emailMsg = budgetAlertEmail(
            (notif.metadata as Record<string, string>)?.dealName || "Project",
            parseInt(notif.message.match(/(\d+)%/)?.[1] || "80")
          );
          break;
        case "milestone_overdue":
          emailMsg = milestoneOverdueEmail(
            notif.title,
            (notif.metadata as Record<string, string>)?.dealName || "Project",
            notif.message
          );
          break;
        default:
          emailMsg = {
            to: notif.user.email,
            subject: notif.title,
            html: `<p>${notif.message}</p>`,
            text: notif.message,
          };
      }

      emailMsg.to = notif.user.email;
      const result = await sendEmail(emailMsg);

      if (result.success) {
        sent++;
        await prisma.notification.update({
          where: { id: notif.id },
          data: { read: true },
        });
      } else {
        errors.push(`${notif.id}: ${result.error}`);
      }
    }

    logger.info("Notification emails sent", { sent, total: notifications.length, errors: errors.length });

    return apiSuccess({
      sent,
      total: notifications.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
