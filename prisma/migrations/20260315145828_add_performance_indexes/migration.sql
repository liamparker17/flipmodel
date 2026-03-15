-- CreateIndex
CREATE INDEX "Deal_orgId_createdAt_idx" ON "Deal"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Expense_orgId_createdAt_idx" ON "Expense"("orgId", "createdAt");
