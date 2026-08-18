-- CreateTable
CREATE TABLE "LeaveGroupMember" (
    "id" TEXT NOT NULL,
    "leaveGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveGroupMember_userId_idx" ON "LeaveGroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveGroupMember_leaveGroupId_userId_key" ON "LeaveGroupMember"("leaveGroupId", "userId");

-- AddForeignKey
ALTER TABLE "LeaveGroupMember" ADD CONSTRAINT "LeaveGroupMember_leaveGroupId_fkey" FOREIGN KEY ("leaveGroupId") REFERENCES "LeaveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveGroupMember" ADD CONSTRAINT "LeaveGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "LeaveApplication" ADD COLUMN     "leaveGroupId" TEXT;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_leaveGroupId_fkey" FOREIGN KEY ("leaveGroupId") REFERENCES "LeaveGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data backfill: turn each existing User.leaveGroupId into an explicit
-- LeaveGroupMember row, before the column it came from is dropped below.
INSERT INTO "LeaveGroupMember" ("id", "leaveGroupId", "userId", "createdAt")
SELECT gen_random_uuid()::text, "leaveGroupId", "id", CURRENT_TIMESTAMP
FROM "User"
WHERE "leaveGroupId" IS NOT NULL;

-- Data backfill: stamp each existing leave application with the group its
-- applicant belonged to at the time, so historical rows keep a group
-- association instead of silently losing it.
UPDATE "LeaveApplication" la
SET "leaveGroupId" = u."leaveGroupId"
FROM "User" u
WHERE la."userId" = u."id" AND u."leaveGroupId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_leaveGroupId_fkey";

-- DropIndex
DROP INDEX "User_leaveGroupId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "leaveGroupId";
