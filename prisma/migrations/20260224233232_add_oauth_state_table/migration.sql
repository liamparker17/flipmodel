/*
  Warnings:

  - Made the column `orgId` on table `Activity` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Activity" ALTER COLUMN "orgId" SET NOT NULL;

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "returnTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "loanType" TEXT NOT NULL DEFAULT 'bond',
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "monthlyPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "approvalDate" TIMESTAMP(3),
    "disbursementDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "inspector" TEXT NOT NULL DEFAULT '',
    "inspectionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "reportUrl" TEXT,
    "findings" TEXT NOT NULL DEFAULT '',
    "estimatedRepairCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "remediatedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "permitType" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'not_applied',
    "appliedDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "issuingAuthority" TEXT NOT NULL DEFAULT '',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparableSale" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "saleDate" TIMESTAMP(3),
    "sqm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricePerSqm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT NOT NULL DEFAULT 'average',
    "source" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparableSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dealId" TEXT,
    "policyType" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT '',
    "policyNumber" TEXT NOT NULL DEFAULT '',
    "coverAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyPremium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorRating" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "dealId" TEXT,
    "qualityScore" INTEGER NOT NULL DEFAULT 3,
    "timelinessScore" INTEGER NOT NULL DEFAULT 3,
    "communicationScore" INTEGER NOT NULL DEFAULT 3,
    "valueScore" INTEGER NOT NULL DEFAULT 3,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "review" TEXT NOT NULL DEFAULT '',
    "wouldRehire" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "OAuthState_state_idx" ON "OAuthState"("state");

-- CreateIndex
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "Loan_orgId_idx" ON "Loan"("orgId");

-- CreateIndex
CREATE INDEX "Loan_dealId_idx" ON "Loan"("dealId");

-- CreateIndex
CREATE INDEX "Inspection_orgId_idx" ON "Inspection"("orgId");

-- CreateIndex
CREATE INDEX "Inspection_dealId_idx" ON "Inspection"("dealId");

-- CreateIndex
CREATE INDEX "Defect_inspectionId_idx" ON "Defect"("inspectionId");

-- CreateIndex
CREATE INDEX "Permit_orgId_idx" ON "Permit"("orgId");

-- CreateIndex
CREATE INDEX "Permit_dealId_idx" ON "Permit"("dealId");

-- CreateIndex
CREATE INDEX "ComparableSale_orgId_idx" ON "ComparableSale"("orgId");

-- CreateIndex
CREATE INDEX "ComparableSale_dealId_idx" ON "ComparableSale"("dealId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_orgId_idx" ON "InsurancePolicy"("orgId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_dealId_idx" ON "InsurancePolicy"("dealId");

-- CreateIndex
CREATE INDEX "ContractorRating_orgId_idx" ON "ContractorRating"("orgId");

-- CreateIndex
CREATE INDEX "ContractorRating_contactId_idx" ON "ContractorRating"("contactId");

-- CreateIndex
CREATE INDEX "ContractorRating_dealId_idx" ON "ContractorRating"("dealId");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableSale" ADD CONSTRAINT "ComparableSale_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableSale" ADD CONSTRAINT "ComparableSale_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorRating" ADD CONSTRAINT "ContractorRating_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorRating" ADD CONSTRAINT "ContractorRating_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorRating" ADD CONSTRAINT "ContractorRating_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
