import { logger } from "./logger";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendViaResend(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "FlipModel <noreply@flipmodel.co.za>",
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("Resend API error", { status: res.status, body });
      return { success: false, error: `Resend API error: ${res.status}` };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    logger.error("Email send failed", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return { success: false, error: "Failed to send email" };
  }
}

async function sendViaSMTP(message: EmailMessage): Promise<EmailResult> {
  // SMTP support - requires nodemailer (optional dependency)
  logger.warn("SMTP email not implemented - install nodemailer for SMTP support");
  return { success: false, error: "SMTP not configured" };
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || "log";

  switch (provider) {
    case "resend":
      return sendViaResend(message);
    case "smtp":
      return sendViaSMTP(message);
    case "log":
    default:
      // Development mode: just log the email
      logger.info("Email (dev mode)", {
        to: message.to,
        subject: message.subject,
      });
      return { success: true, messageId: "dev-" + Date.now() };
  }
}

// ─── Email Templates ───

export function budgetAlertEmail(dealName: string, percentage: number): EmailMessage {
  return {
    to: "", // Caller fills in
    subject: `Budget Alert: ${dealName} at ${percentage}%`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Budget Alert</h2>
        <p>The project <strong>${dealName}</strong> has reached <strong>${percentage}%</strong> of its renovation budget.</p>
        <p>Please review the expenses and take appropriate action.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">This is an automated notification from FlipModel ERP.</p>
      </div>
    `,
    text: `Budget Alert: ${dealName} at ${percentage}% of budget. Please review expenses.`,
  };
}

export function milestoneOverdueEmail(milestoneName: string, dealName: string, dueDate: string): EmailMessage {
  return {
    to: "",
    subject: `Overdue: ${milestoneName} on ${dealName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Milestone Overdue</h2>
        <p>The milestone <strong>${milestoneName}</strong> on project <strong>${dealName}</strong> was due on <strong>${dueDate}</strong>.</p>
        <p>Please update the milestone status or adjust the timeline.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">This is an automated notification from FlipModel ERP.</p>
      </div>
    `,
    text: `Milestone Overdue: ${milestoneName} on ${dealName} was due ${dueDate}.`,
  };
}

export function expenseApprovalEmail(expenseDesc: string, amount: number, dealName: string): EmailMessage {
  return {
    to: "",
    subject: `Expense Approval Required: R${amount.toLocaleString()} for ${dealName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Expense Approval Required</h2>
        <p>A new expense requires your approval:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Description</td><td style="padding: 8px; border: 1px solid #E5E7EB;">${expenseDesc}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Amount</td><td style="padding: 8px; border: 1px solid #E5E7EB;">R${amount.toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Project</td><td style="padding: 8px; border: 1px solid #E5E7EB;">${dealName}</td></tr>
        </table>
        <p>Log in to FlipModel to approve or reject this expense.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">This is an automated notification from FlipModel ERP.</p>
      </div>
    `,
    text: `Expense Approval Required: ${expenseDesc} - R${amount.toLocaleString()} for ${dealName}. Log in to approve/reject.`,
  };
}

export function poApprovalEmail(poNumber: string, total: number, supplierName: string): EmailMessage {
  return {
    to: "",
    subject: `PO Approval Required: ${poNumber} - R${total.toLocaleString()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Purchase Order Approval Required</h2>
        <p>Purchase order <strong>${poNumber}</strong> for <strong>${supplierName || "supplier"}</strong> requires approval.</p>
        <p><strong>Total:</strong> R${total.toLocaleString()}</p>
        <p>Log in to FlipModel to review and approve.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">This is an automated notification from FlipModel ERP.</p>
      </div>
    `,
    text: `PO Approval Required: ${poNumber} - R${total.toLocaleString()} for ${supplierName || "supplier"}.`,
  };
}
