-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriod" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reversalOf" TEXT,
    "periodName" TEXT,
    "notes" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "description" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dealId" TEXT,
    "contactId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "contactId" TEXT,
    "dealId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "notes" TEXT,
    "documentUrl" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillLine" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountCode" TEXT,
    "dealId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VendorBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'eft',
    "reference" TEXT,
    "bankAccountId" TEXT,
    "journalEntryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReceivable" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'outstanding',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "journalEntryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivablePayment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerReceivableId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'eft',
    "reference" TEXT,
    "bankAccountId" TEXT,
    "journalEntryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "contactId" TEXT,
    "dealId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "vendorBillId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inventoryItemId" TEXT,
    "accountCode" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'materials',
    "unit" TEXT NOT NULL DEFAULT 'each',
    "quantityOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantityReserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderPoint" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "dealId" TEXT,
    "notes" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "branchCode" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'cheque',
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION,
    "reference" TEXT,
    "type" TEXT NOT NULL DEFAULT 'other',
    "category" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "matchedEntityType" TEXT,
    "matchedEntityId" TEXT,
    "importBatch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "contactId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "idNumber" TEXT,
    "taxNumber" TEXT,
    "position" TEXT NOT NULL DEFAULT '',
    "department" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'full_time',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "bankName" TEXT,
    "accountNumber" TEXT,
    "branchCode" TEXT,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL DEFAULT 'annual',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "basePay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uif" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pensionFund" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medicalAid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "paymentDate" TIMESTAMP(3),
    "paymentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_orgId_idx" ON "AuditLog"("orgId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_entityType_idx" ON "AuditLog"("orgId", "entityType");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_userId_idx" ON "AuditLog"("orgId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FinancialPeriod_orgId_idx" ON "FinancialPeriod"("orgId");

-- CreateIndex
CREATE INDEX "FinancialPeriod_orgId_status_idx" ON "FinancialPeriod"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriod_orgId_name_key" ON "FinancialPeriod"("orgId", "name");

-- CreateIndex
CREATE INDEX "JournalEntry_orgId_idx" ON "JournalEntry"("orgId");

-- CreateIndex
CREATE INDEX "JournalEntry_orgId_date_idx" ON "JournalEntry"("orgId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_orgId_status_idx" ON "JournalEntry"("orgId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_orgId_entryNumber_key" ON "JournalEntry"("orgId", "entryNumber");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountCode_idx" ON "JournalLine"("accountCode");

-- CreateIndex
CREATE INDEX "JournalLine_dealId_idx" ON "JournalLine"("dealId");

-- CreateIndex
CREATE INDEX "VendorBill_orgId_idx" ON "VendorBill"("orgId");

-- CreateIndex
CREATE INDEX "VendorBill_orgId_status_idx" ON "VendorBill"("orgId", "status");

-- CreateIndex
CREATE INDEX "VendorBill_orgId_dueDate_idx" ON "VendorBill"("orgId", "dueDate");

-- CreateIndex
CREATE INDEX "VendorBill_contactId_idx" ON "VendorBill"("contactId");

-- CreateIndex
CREATE INDEX "VendorBill_dealId_idx" ON "VendorBill"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_orgId_billNumber_key" ON "VendorBill"("orgId", "billNumber");

-- CreateIndex
CREATE INDEX "VendorBillLine_vendorBillId_idx" ON "VendorBillLine"("vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_orgId_idx" ON "BillPayment"("orgId");

-- CreateIndex
CREATE INDEX "BillPayment_vendorBillId_idx" ON "BillPayment"("vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_bankAccountId_idx" ON "BillPayment"("bankAccountId");

-- CreateIndex
CREATE INDEX "CustomerReceivable_orgId_idx" ON "CustomerReceivable"("orgId");

-- CreateIndex
CREATE INDEX "CustomerReceivable_orgId_status_idx" ON "CustomerReceivable"("orgId", "status");

-- CreateIndex
CREATE INDEX "CustomerReceivable_orgId_dueDate_idx" ON "CustomerReceivable"("orgId", "dueDate");

-- CreateIndex
CREATE INDEX "CustomerReceivable_contactId_idx" ON "CustomerReceivable"("contactId");

-- CreateIndex
CREATE INDEX "CustomerReceivable_invoiceId_idx" ON "CustomerReceivable"("invoiceId");

-- CreateIndex
CREATE INDEX "ReceivablePayment_orgId_idx" ON "ReceivablePayment"("orgId");

-- CreateIndex
CREATE INDEX "ReceivablePayment_customerReceivableId_idx" ON "ReceivablePayment"("customerReceivableId");

-- CreateIndex
CREATE INDEX "ReceivablePayment_bankAccountId_idx" ON "ReceivablePayment"("bankAccountId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_orgId_idx" ON "PurchaseOrder"("orgId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_orgId_status_idx" ON "PurchaseOrder"("orgId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_contactId_idx" ON "PurchaseOrder"("contactId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_dealId_idx" ON "PurchaseOrder"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_orgId_poNumber_key" ON "PurchaseOrder"("orgId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_inventoryItemId_idx" ON "PurchaseOrderLine"("inventoryItemId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_orgId_idx" ON "GoodsReceipt"("orgId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_purchaseOrderId_idx" ON "GoodsReceipt"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_idx" ON "InventoryItem"("orgId");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_category_idx" ON "InventoryItem"("orgId", "category");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_quantityOnHand_idx" ON "InventoryItem"("orgId", "quantityOnHand");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_orgId_sku_key" ON "InventoryItem"("orgId", "sku");

-- CreateIndex
CREATE INDEX "InventoryTransaction_orgId_idx" ON "InventoryTransaction"("orgId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_inventoryItemId_idx" ON "InventoryTransaction"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_orgId_type_idx" ON "InventoryTransaction"("orgId", "type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_dealId_idx" ON "InventoryTransaction"("dealId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_referenceType_referenceId_idx" ON "InventoryTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "BankAccount_orgId_idx" ON "BankAccount"("orgId");

-- CreateIndex
CREATE INDEX "BankAccount_orgId_isActive_idx" ON "BankAccount"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "BankTransaction_orgId_idx" ON "BankTransaction"("orgId");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_idx" ON "BankTransaction"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_date_idx" ON "BankTransaction"("bankAccountId", "date");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_isReconciled_idx" ON "BankTransaction"("bankAccountId", "isReconciled");

-- CreateIndex
CREATE INDEX "BankTransaction_matchedEntityType_matchedEntityId_idx" ON "BankTransaction"("matchedEntityType", "matchedEntityId");

-- CreateIndex
CREATE INDEX "Employee_orgId_idx" ON "Employee"("orgId");

-- CreateIndex
CREATE INDEX "Employee_orgId_status_idx" ON "Employee"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_orgId_employeeNumber_key" ON "Employee"("orgId", "employeeNumber");

-- CreateIndex
CREATE INDEX "LeaveRecord_orgId_idx" ON "LeaveRecord"("orgId");

-- CreateIndex
CREATE INDEX "LeaveRecord_employeeId_idx" ON "LeaveRecord"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveRecord_orgId_status_idx" ON "LeaveRecord"("orgId", "status");

-- CreateIndex
CREATE INDEX "Payslip_orgId_idx" ON "Payslip"("orgId");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- CreateIndex
CREATE INDEX "Payslip_orgId_status_idx" ON "Payslip"("orgId", "status");

-- CreateIndex
CREATE INDEX "Payslip_orgId_periodStart_idx" ON "Payslip"("orgId", "periodStart");

-- AddForeignKey
ALTER TABLE "FinancialPeriod" ADD CONSTRAINT "FinancialPeriod_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReceivable" ADD CONSTRAINT "CustomerReceivable_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_customerReceivableId_fkey" FOREIGN KEY ("customerReceivableId") REFERENCES "CustomerReceivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRecord" ADD CONSTRAINT "LeaveRecord_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRecord" ADD CONSTRAINT "LeaveRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
