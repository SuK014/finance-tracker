-- Catch-up migration: this captures schema changes that were applied
-- directly to the database (via `prisma db push` or similar) between
-- 20260725161829_add_soft_delete and 20260914150000_add_user_scoping,
-- without ever being recorded as a tracked migration. The database
-- already has this state — this migration is marked as applied via
-- `prisma migrate resolve`, not executed, so it makes no changes here.
-- It exists purely so migration history matches reality and future
-- `prisma migrate dev` runs stop detecting drift.

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'expense';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "evidenceUrl" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "accountId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "frequency" TEXT NOT NULL,
    "nextDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
