-- AlterTable
ALTER TABLE "User" ADD COLUMN     "annualLeaveBroughtForward" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "annualLeaveEntitlement" DOUBLE PRECISION;

