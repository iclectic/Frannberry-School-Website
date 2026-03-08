-- CreateEnum
CREATE TYPE "ConferenceStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "conference_slots" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "location" TEXT,
    "meeting_url" TEXT,
    "status" "ConferenceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "parent_id" TEXT,
    "student_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_announcements" BOOLEAN NOT NULL DEFAULT true,
    "email_messages" BOOLEAN NOT NULL DEFAULT true,
    "email_assignments" BOOLEAN NOT NULL DEFAULT true,
    "email_results" BOOLEAN NOT NULL DEFAULT true,
    "email_events" BOOLEAN NOT NULL DEFAULT true,
    "email_fees" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "digest_enabled" BOOLEAN NOT NULL DEFAULT false,
    "digest_frequency" TEXT NOT NULL DEFAULT 'daily',

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "custom_role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_custom_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "custom_role_id" TEXT NOT NULL,

    CONSTRAINT "user_custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conference_slots_teacher_id_date_idx" ON "conference_slots"("teacher_id", "date");

-- CreateIndex
CREATE INDEX "conference_slots_parent_id_idx" ON "conference_slots"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_name_key" ON "custom_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_custom_role_id_permission_id_key" ON "role_permissions"("custom_role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_custom_roles_user_id_custom_role_id_key" ON "user_custom_roles"("user_id", "custom_role_id");

-- AddForeignKey
ALTER TABLE "conference_slots" ADD CONSTRAINT "conference_slots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_slots" ADD CONSTRAINT "conference_slots_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_slots" ADD CONSTRAINT "conference_slots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_custom_roles" ADD CONSTRAINT "user_custom_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_custom_roles" ADD CONSTRAINT "user_custom_roles_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
