-- Bonds held directly: no live price, valued by simple interest from the start date to maturity
CREATE TABLE "Bond" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "principal" DOUBLE PRECISION NOT NULL,
    "ratePct" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Bond_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Bond_userId_idx" ON "Bond"("userId");

ALTER TABLE "Bond" ADD CONSTRAINT "Bond_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
