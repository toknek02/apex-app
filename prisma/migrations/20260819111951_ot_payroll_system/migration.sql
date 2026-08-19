-- AlterTable
ALTER TABLE "User" DROP COLUMN "hourlyRate",
DROP COLUMN "otRate",
ADD COLUMN     "basicSalary" DOUBLE PRECISION,
ADD COLUMN     "otEligible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_date_key" ON "PublicHoliday"("date");

