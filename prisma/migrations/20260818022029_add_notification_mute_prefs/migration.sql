-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mutedNotificationTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
