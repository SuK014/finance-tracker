/*
  Warnings:

  - You are about to drop the column `averageCost` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the `AssetPrice` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[symbol]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "AssetPrice" DROP CONSTRAINT "AssetPrice_assetId_fkey";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "averageCost",
DROP COLUMN "quantity";

-- DropTable
DROP TABLE "AssetPrice";

-- CreateTable
CREATE TABLE "AssetLot" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "lotType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");

-- AddForeignKey
ALTER TABLE "AssetLot" ADD CONSTRAINT "AssetLot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
