-- AlterTable
ALTER TABLE "BillPayment" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "CustomerReceivable" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ReceivablePayment" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "VendorBill" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "JournalEntrySequence" (
    "orgId" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JournalEntrySequence_pkey" PRIMARY KEY ("orgId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillPayment_orgId_idempotencyKey_key" ON "BillPayment"("orgId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivablePayment_orgId_idempotencyKey_key" ON "ReceivablePayment"("orgId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "JournalEntrySequence" ADD CONSTRAINT "JournalEntrySequence_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
