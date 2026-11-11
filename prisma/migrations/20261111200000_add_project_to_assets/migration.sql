ALTER TABLE "asset_list"
ADD COLUMN "project_id" TEXT;

ALTER TABLE "asset_list"
ADD CONSTRAINT "asset_list_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "asset_list_project_id_idx" ON "asset_list"("project_id");
