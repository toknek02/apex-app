-- AlterTable
ALTER TABLE "PasswordResetRequest" ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenHash" TEXT;

-- CreateTable
CREATE TABLE "LeaveRollover" (
    "id" TEXT NOT NULL,
    "fromYear" INTEGER NOT NULL,
    "capDays" DOUBLE PRECISION,
    "affectedCount" INTEGER NOT NULL,
    "appliedById" TEXT NOT NULL,
    "appliedByName" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRollover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRollover_fromYear_key" ON "LeaveRollover"("fromYear");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequest_tokenHash_key" ON "PasswordResetRequest"("tokenHash");

