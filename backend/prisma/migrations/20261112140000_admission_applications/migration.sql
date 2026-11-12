CREATE TYPE "AdmissionStatus" AS ENUM ('RECEIVED', 'ENROLLED', 'DECLINED');

CREATE TABLE "admission_applications" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "child_first_name" TEXT NOT NULL,
    "child_last_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "key_stage" "KeyStage" NOT NULL,
    "parent_first_name" TEXT NOT NULL,
    "parent_last_name" TEXT NOT NULL,
    "parent_email" TEXT NOT NULL,
    "parent_phone" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'RECEIVED',
    "student_id" TEXT,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admission_applications_reference_key" ON "admission_applications"("reference");
CREATE UNIQUE INDEX "admission_applications_student_id_key" ON "admission_applications"("student_id");
CREATE INDEX "admission_applications_school_id_status_idx" ON "admission_applications"("school_id", "status");

ALTER TABLE "admission_applications"
  ADD CONSTRAINT "admission_applications_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admission_applications"
  ADD CONSTRAINT "admission_applications_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admission_applications"
  ADD CONSTRAINT "admission_applications_decided_by_id_fkey"
  FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
