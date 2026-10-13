-- Add nullable userId columns first (existing rows need backfilling before NOT NULL)
ALTER TABLE "Account" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Category" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Transaction" ADD COLUMN "userId" INTEGER;
ALTER TABLE "RecurringTransaction" ADD COLUMN "userId" INTEGER;
ALTER TABLE "AssetLot" ADD COLUMN "userId" INTEGER;

-- Backfill all existing rows to the sole existing account (id 3, aea@gmail.com)
-- — the only user in the database at the time of this migration.
UPDATE "Account" SET "userId" = 3 WHERE "userId" IS NULL;
UPDATE "Category" SET "userId" = 3 WHERE "userId" IS NULL;
UPDATE "Transaction" SET "userId" = 3 WHERE "userId" IS NULL;
UPDATE "RecurringTransaction" SET "userId" = 3 WHERE "userId" IS NULL;
UPDATE "AssetLot" SET "userId" = 3 WHERE "userId" IS NULL;

-- Now safe to enforce NOT NULL
ALTER TABLE "Account" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "RecurringTransaction" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AssetLot" ALTER COLUMN "userId" SET NOT NULL;

-- Foreign keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetLot" ADD CONSTRAINT "AssetLot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes for per-user filtering (every route query will filter by userId)
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");
CREATE INDEX "AssetLot_userId_idx" ON "AssetLot"("userId");
