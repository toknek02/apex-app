-- DropIndex
DROP INDEX "PublicHoliday_date_key";

-- AlterTable
ALTER TABLE "PublicHoliday" DROP COLUMN "date",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_startDate_endDate_key" ON "PublicHoliday"("startDate", "endDate");

