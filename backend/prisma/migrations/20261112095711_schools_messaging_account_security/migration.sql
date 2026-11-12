-- CreateEnum
CREATE TYPE "SchoolPhase" AS ENUM ('NURSERY', 'PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "KeyStage" AS ENUM ('EYFS', 'KS1', 'KS2', 'KS3', 'KS4', 'KS5');

-- CreateEnum
CREATE TYPE "ConversationPurpose" AS ENUM ('PARENT_TEACHER', 'PARENT_HEAD', 'TEACHER_TEACHER', 'TEACHER_HEAD', 'PUPIL_TEACHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HEAD';

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "phase" "SchoolPhase" NOT NULL,
    "name" TEXT NOT NULL,
    "age_min" INTEGER NOT NULL,
    "age_max" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "schools_phase_key" ON "schools"("phase");

INSERT INTO "schools" ("id", "phase", "name", "age_min", "age_max") VALUES
  ('school-nursery', 'NURSERY', 'Nursery', 2, 4),
  ('school-primary', 'PRIMARY', 'Primary', 4, 11),
  ('school-secondary', 'SECONDARY', 'Secondary', 11, 18);

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "key_stage" "KeyStage",
ADD COLUMN "school_id" TEXT;

UPDATE "classes" SET "school_id" = 'school-secondary', "key_stage" = 'KS3' WHERE "school_id" IS NULL;

ALTER TABLE "classes" ALTER COLUMN "key_stage" SET NOT NULL,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "purpose" "ConversationPurpose",
ADD COLUMN "school_id" TEXT,
ADD COLUMN "student_id" TEXT;

UPDATE "conversations" SET "purpose" = 'PARENT_TEACHER', "school_id" = 'school-secondary' WHERE "purpose" IS NULL;

ALTER TABLE "conversations" ALTER COLUMN "purpose" SET NOT NULL,
ALTER COLUMN "school_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN "first_name" TEXT,
ADD COLUMN "last_name" TEXT,
ADD COLUMN "school_id" TEXT;

UPDATE "student_profiles" AS sp
SET "first_name" = u."first_name", "last_name" = u."last_name"
FROM "users" AS u
WHERE u."id" = sp."user_id" AND sp."first_name" IS NULL;

UPDATE "student_profiles" SET "first_name" = 'Pupil' WHERE "first_name" IS NULL;
UPDATE "student_profiles" SET "last_name" = '' WHERE "last_name" IS NULL;
UPDATE "student_profiles" SET "school_id" = 'school-secondary' WHERE "school_id" IS NULL AND "user_id" IS NOT NULL;

ALTER TABLE "student_profiles" ALTER COLUMN "first_name" SET NOT NULL,
ALTER COLUMN "last_name" SET NOT NULL,
ALTER COLUMN "user_id" DROP NOT NULL;

-- Existing refresh tokens are plaintext. New tokens are stored as hashes.
UPDATE "refresh_tokens" SET "revoked" = true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "head_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "head_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "head_profiles_user_id_key" ON "head_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "head_profiles_school_id_key" ON "head_profiles"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "head_profiles_employee_id_key" ON "head_profiles"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE INDEX "backup_codes_user_id_code_hash_idx" ON "backup_codes"("user_id", "code_hash");

-- CreateIndex
CREATE INDEX "conversations_purpose_student_id_idx" ON "conversations"("purpose", "student_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "head_profiles" ADD CONSTRAINT "head_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "head_profiles" ADD CONSTRAINT "head_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_codes" ADD CONSTRAINT "backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
