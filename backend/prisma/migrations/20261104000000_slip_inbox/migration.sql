-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inboxKeyHash" TEXT;

-- CreateTable
CREATE TABLE "PendingSlip" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawText" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "image" BYTEA,
    "imageType" TEXT,
    "takenAt" TIMESTAMPTZ(3),
    "amount" DOUBLE PRECISION,
    "type" TEXT,
    "description" TEXT,
    "day" TEXT,
    "time" TEXT,
    "timeSource" TEXT,
    "parsedBy" TEXT,
    "transactionId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PendingSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingSlip_userId_status_idx" ON "PendingSlip"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PendingSlip_userId_dedupeKey_key" ON "PendingSlip"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_inboxKeyHash_key" ON "User"("inboxKeyHash");

-- AddForeignKey
ALTER TABLE "PendingSlip" ADD CONSTRAINT "PendingSlip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

