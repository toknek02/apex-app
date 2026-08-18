-- AlterTable
ALTER TABLE "LeaveApplication" ADD COLUMN     "architectApprovedAt" TIMESTAMP(3),
ADD COLUMN     "architectApprovedById" TEXT,
ADD COLUMN     "architectApprovedByName" TEXT,
ADD COLUMN     "architectRemarks" TEXT,
ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_DIRECTOR';

-- AlterTable
ALTER TABLE "LeaveGroup" ADD COLUMN     "architectId" TEXT;

-- AddForeignKey
ALTER TABLE "LeaveGroup" ADD CONSTRAINT "LeaveGroup_architectId_fkey" FOREIGN KEY ("architectId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_architectApprovedById_fkey" FOREIGN KEY ("architectApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
