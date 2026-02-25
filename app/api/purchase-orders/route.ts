import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";
import { createPurchaseOrderSchema } from "@/lib/validations/purchase-orders";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrgMember();
    const pagination = parsePagination(req);
    const status = req.nextUrl.searchParams.get("status");
    const contactId = req.nextUrl.searchParams.get("contactId");
    const dealId = req.nextUrl.searchParams.get("dealId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return apiSuccess(paginatedResult(orders, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("shopping:write");
    const body = await req.json();
    const data = createPurchaseOrderSchema.parse(body);

    // Auto-generate PO number
    const count = await prisma.purchaseOrder.count({ where: { orgId: ctx.orgId } });
    const poNumber = `PO-${String(count + 1).padStart(6, "0")}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        poNumber,
        contactId: data.contactId,
        dealId: data.dealId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        shippingCost: data.shippingCost || 0,
        currency: data.currency || "ZAR",
        deliveryAddress: data.deliveryAddress,
        notes: data.notes,
        status: "draft",
        lines: {
          create: data.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
            inventoryItemId: line.inventoryItemId,
            accountCode: line.accountCode,
          })),
        },
      },
      include: { lines: true },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "PurchaseOrder",
      entityId: order.id,
      metadata: { poNumber },
    });

    return apiSuccess(order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
