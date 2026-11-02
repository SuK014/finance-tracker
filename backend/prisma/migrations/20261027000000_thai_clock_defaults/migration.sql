-- Rows created by the database itself get the Thai clock time, like every other date in the app.
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT timezone('Asia/Bangkok', now());
ALTER TABLE "Transaction" ALTER COLUMN "createdAt" SET DEFAULT timezone('Asia/Bangkok', now());
ALTER TABLE "RecurringTransaction" ALTER COLUMN "createdAt" SET DEFAULT timezone('Asia/Bangkok', now());
ALTER TABLE "AssetLot" ALTER COLUMN "date" SET DEFAULT timezone('Asia/Bangkok', now());
ALTER TABLE "Goal" ALTER COLUMN "createdAt" SET DEFAULT timezone('Asia/Bangkok', now());
ALTER TABLE "GoalEntry" ALTER COLUMN "date" SET DEFAULT timezone('Asia/Bangkok', now());
ALTER TABLE "Bond" ALTER COLUMN "createdAt" SET DEFAULT timezone('Asia/Bangkok', now());
