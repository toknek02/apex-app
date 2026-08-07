-- CreateTable
CREATE TABLE "OrgSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "officeLat" DOUBLE PRECISION,
    "officeLng" DOUBLE PRECISION,
    "officeRadiusM" INTEGER NOT NULL DEFAULT 200,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSettings_pkey" PRIMARY KEY ("id")
);
