-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "offices" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shortName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "otRate" DOUBLE PRECISION;
