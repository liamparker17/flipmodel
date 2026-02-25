import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requirePermission, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("accounting:read");
    const type = req.nextUrl.searchParams.get("type") || "trial_balance";
    const asOfDate = req.nextUrl.searchParams.get("asOfDate") || new Date().toISOString().split("T")[0];
    const startDate = req.nextUrl.searchParams.get("startDate");

    if (!["balance_sheet", "income_statement", "trial_balance"].includes(type)) {
      return apiError("Invalid type. Must be balance_sheet, income_statement, or trial_balance", 400);
    }

    const asOf = new Date(asOfDate + "T23:59:59.999Z");

    if (type === "trial_balance") {
      const lines = await prisma.journalLine.groupBy({
        by: ["accountCode", "accountName"],
        where: {
          journalEntry: {
            orgId: ctx.orgId,
            status: "posted",
          },
        },
        _sum: {
          debit: true,
          credit: true,
        },
      });

      const accounts = lines.map((line) => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        totalDebit: line._sum.debit ?? 0,
        totalCredit: line._sum.credit ?? 0,
        balance: (line._sum.debit ?? 0) - (line._sum.credit ?? 0),
      }));

      accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      return apiSuccess({ type: "trial_balance", asOfDate, accounts });
    }

    if (type === "income_statement") {
      const periodStart = startDate ? new Date(startDate) : new Date(asOfDate.slice(0, 4) + "-01-01");

      const lines = await prisma.journalLine.groupBy({
        by: ["accountCode", "accountName"],
        where: {
          journalEntry: {
            orgId: ctx.orgId,
            status: "posted",
            date: { gte: periodStart, lte: asOf },
          },
        },
        _sum: {
          debit: true,
          credit: true,
        },
      });

      const revenue: { accountCode: string; accountName: string; amount: number }[] = [];
      const expenses: { accountCode: string; accountName: string; amount: number }[] = [];

      for (const line of lines) {
        const debit = line._sum.debit ?? 0;
        const credit = line._sum.credit ?? 0;

        if (line.accountCode.startsWith("4")) {
          // Revenue: credits increase revenue
          revenue.push({
            accountCode: line.accountCode,
            accountName: line.accountName,
            amount: credit - debit,
          });
        } else if (line.accountCode.startsWith("5")) {
          // Expenses: debits increase expenses
          expenses.push({
            accountCode: line.accountCode,
            accountName: line.accountName,
            amount: debit - credit,
          });
        }
      }

      revenue.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      expenses.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      return apiSuccess({
        type: "income_statement",
        startDate: periodStart.toISOString().split("T")[0],
        asOfDate,
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
      });
    }

    // balance_sheet
    const lines = await prisma.journalLine.groupBy({
      by: ["accountCode", "accountName"],
      where: {
        journalEntry: {
          orgId: ctx.orgId,
          status: "posted",
          date: { lte: asOf },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const assets: { accountCode: string; accountName: string; balance: number }[] = [];
    const liabilities: { accountCode: string; accountName: string; balance: number }[] = [];
    const equity: { accountCode: string; accountName: string; balance: number }[] = [];

    for (const line of lines) {
      const debit = line._sum.debit ?? 0;
      const credit = line._sum.credit ?? 0;

      if (line.accountCode.startsWith("1")) {
        // Assets: debit normal balance
        assets.push({
          accountCode: line.accountCode,
          accountName: line.accountName,
          balance: debit - credit,
        });
      } else if (line.accountCode.startsWith("2")) {
        // Liabilities: credit normal balance
        liabilities.push({
          accountCode: line.accountCode,
          accountName: line.accountName,
          balance: credit - debit,
        });
      } else if (line.accountCode.startsWith("3")) {
        // Equity: credit normal balance
        equity.push({
          accountCode: line.accountCode,
          accountName: line.accountName,
          balance: credit - debit,
        });
      }
    }

    assets.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    liabilities.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    equity.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

    return apiSuccess({
      type: "balance_sheet",
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
