-- Marks the cash side of a portfolio buy/sell so it can be kept out of spending totals
ALTER TABLE "Transaction" ADD COLUMN "source" TEXT;

-- A buy/sell can point at the account the money moved through, and the transaction that recorded it
ALTER TABLE "AssetLot" ADD COLUMN "accountId" INTEGER;
ALTER TABLE "AssetLot" ADD COLUMN "transactionId" INTEGER;

CREATE UNIQUE INDEX "AssetLot_transactionId_key" ON "AssetLot"("transactionId");

ALTER TABLE "AssetLot" ADD CONSTRAINT "AssetLot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetLot" ADD CONSTRAINT "AssetLot_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
