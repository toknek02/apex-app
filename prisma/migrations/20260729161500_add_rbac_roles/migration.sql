-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bootstrap roles (kept in sync with prisma/seed.ts, which upserts on the unique "name"/"code" so re-running seed is safe)
INSERT INTO "Role" ("id", "name", "description", "isSystem", "createdAt", "updatedAt") VALUES
    ('role_administrator', 'Administrator', 'Full system access. Protected — cannot be edited or deleted.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_employee', 'Employee', 'Default role with no elevated permissions.', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Permission" ("id", "code", "label", "description") VALUES
    ('perm_manage_users', 'MANAGE_USERS', 'Manage users', 'Create, edit, deactivate/reactivate users, and reset passwords.'),
    ('perm_manage_roles', 'MANAGE_ROLES', 'Manage roles', 'Create roles and configure which permissions each role grants.'),
    ('perm_manage_venues', 'MANAGE_VENUES', 'Manage venues', 'Create and edit venues used in the LogBook.'),
    ('perm_manage_projects', 'MANAGE_PROJECTS', 'Manage projects', 'Create and edit projects used in the LogBook.'),
    ('perm_edit_any_event', 'EDIT_ANY_EVENT', 'Edit any event', 'Edit LogBook events created by other employees, not just your own.');

INSERT INTO "RolePermission" ("id", "roleId", "permissionId") VALUES
    ('rp_admin_users', 'role_administrator', 'perm_manage_users'),
    ('rp_admin_roles', 'role_administrator', 'perm_manage_roles'),
    ('rp_admin_venues', 'role_administrator', 'perm_manage_venues'),
    ('rp_admin_projects', 'role_administrator', 'perm_manage_projects'),
    ('rp_admin_events', 'role_administrator', 'perm_edit_any_event');

-- Migrate User.role (string) -> User.roleId (FK), preserving existing rows
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

UPDATE "User" SET "roleId" = CASE WHEN "role" = 'ADMIN' THEN 'role_administrator' ELSE 'role_employee' END;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "role";

CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
