-- AlterTable
ALTER TABLE "User" ADD COLUMN     "medicalLeaveBroughtForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "medicalLeaveEntitlement" DOUBLE PRECISION;

