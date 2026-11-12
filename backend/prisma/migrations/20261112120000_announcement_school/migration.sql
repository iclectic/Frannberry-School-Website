-- School-wide announcements belong to one school. A null school is trust-wide.
ALTER TABLE "announcements" ADD COLUMN "school_id" TEXT;

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
