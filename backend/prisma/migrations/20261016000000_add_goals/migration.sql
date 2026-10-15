-- Savings goals, and the money set aside for them (the money stays in a real account)
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "target" DOUBLE PRECISION NOT NULL,
    "deadline" TIMESTAMP(3),
    "ruleType" TEXT,
    "ruleValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoalEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "kind" TEXT NOT NULL,
    "transactionId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GoalEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoalEntry_transactionId_key" ON "GoalEntry"("transactionId");
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX "GoalEntry_userId_idx" ON "GoalEntry"("userId");
CREATE INDEX "GoalEntry_goalId_idx" ON "GoalEntry"("goalId");
CREATE INDEX "GoalEntry_accountId_idx" ON "GoalEntry"("accountId");

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoalEntry" ADD CONSTRAINT "GoalEntry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoalEntry" ADD CONSTRAINT "GoalEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoalEntry" ADD CONSTRAINT "GoalEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
