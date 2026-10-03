CREATE TYPE "AssetLifecycle" AS ENUM ('AVAILABLE', 'UNDER_REPAIR', 'DISPOSED');
CREATE TYPE "AssetTransferStatus" AS ENUM ('PENDING', 'RECEIVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "AssetEventType" AS ENUM ('PURCHASED', 'UPDATED', 'TRANSFER_REQUESTED', 'TRANSFER_RECEIVED', 'TRANSFER_REJECTED', 'TRANSFER_CANCELLED', 'SPLIT', 'SENT_FOR_REPAIR', 'RETURNED_FROM_REPAIR', 'DISPOSED');

ALTER TABLE "item_categories" ADD COLUMN "code_prefix" TEXT, ADD COLUMN "code_counter" INTEGER NOT NULL DEFAULT 0;

WITH base AS (
    SELECT "id",
           COALESCE(NULLIF(LEFT(UPPER(REGEXP_REPLACE("name", '[^A-Za-z0-9]', '', 'g')), 3), ''), 'CAT') AS prefix,
           ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(LEFT(UPPER(REGEXP_REPLACE("name", '[^A-Za-z0-9]', '', 'g')), 3), ''), 'CAT') ORDER BY "createdAt", "id") AS rn
    FROM "item_categories"
)
UPDATE "item_categories" c
SET "code_prefix" = CASE WHEN base.rn = 1 THEN base.prefix ELSE base.prefix || base.rn::text END
FROM base WHERE base."id" = c."id";

ALTER TABLE "item_categories" ALTER COLUMN "code_prefix" SET NOT NULL;
CREATE UNIQUE INDEX "item_categories_code_prefix_key" ON "item_categories"("code_prefix");

ALTER TABLE "asset_list"
    ADD COLUMN "asset_code" TEXT,
    ADD COLUMN "lifecycle" "AssetLifecycle" NOT NULL DEFAULT 'AVAILABLE',
    ADD COLUMN "parent_asset_id" TEXT;

WITH numbered AS (
    SELECT a."id", c."code_prefix" AS prefix,
           ROW_NUMBER() OVER (PARTITION BY c."id" ORDER BY a."createdAt", a."id") AS rn
    FROM "asset_list" a
    JOIN "item_masters" m ON m."id" = a."item_master_id"
    JOIN "item_categories" c ON c."id" = m."category_id"
)
UPDATE "asset_list" a
SET "asset_code" = numbered.prefix || '-' || LPAD(numbered.rn::text, 5, '0')
FROM numbered WHERE numbered."id" = a."id";

UPDATE "item_categories" c
SET "code_counter" = COALESCE((
    SELECT COUNT(*) FROM "asset_list" a JOIN "item_masters" m ON m."id" = a."item_master_id" WHERE m."category_id" = c."id"
), 0);

ALTER TABLE "asset_list" ALTER COLUMN "asset_code" SET NOT NULL;
CREATE UNIQUE INDEX "asset_list_asset_code_key" ON "asset_list"("asset_code");
CREATE UNIQUE INDEX "asset_list_item_master_id_serial_number_key" ON "asset_list"("item_master_id", "serial_number");
CREATE INDEX "asset_list_serial_number_idx" ON "asset_list"("serial_number");

CREATE TABLE "asset_transfers" (
    "id" TEXT NOT NULL,
    "transfer_no" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "from_center_id" TEXT NOT NULL,
    "to_center_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "AssetTransferStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "responded_by_id" TEXT,
    "responded_at" TIMESTAMP(3),
    "response_remarks" TEXT,
    "resulting_asset_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "asset_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_transfers_transfer_no_key" ON "asset_transfers"("transfer_no");
CREATE INDEX "asset_transfers_from_center_id_status_idx" ON "asset_transfers"("from_center_id", "status");
CREATE INDEX "asset_transfers_to_center_id_status_idx" ON "asset_transfers"("to_center_id", "status");
CREATE INDEX "asset_transfers_asset_id_status_idx" ON "asset_transfers"("asset_id", "status");

CREATE TABLE "asset_events" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "AssetEventType" NOT NULL,
    "center_id" TEXT,
    "from_center_id" TEXT,
    "to_center_id" TEXT,
    "quantity" INTEGER,
    "remarks" TEXT,
    "performed_by_id" TEXT,
    "reference_no" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "asset_events_asset_id_createdAt_idx" ON "asset_events"("asset_id", "createdAt");

ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_asset_id_fkey"
FOREIGN KEY ("asset_id") REFERENCES "asset_list"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asset_events" ADD CONSTRAINT "asset_events_asset_id_fkey"
FOREIGN KEY ("asset_id") REFERENCES "asset_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "asset_events" ("id", "asset_id", "type", "center_id", "quantity", "remarks", "createdAt")
SELECT 'ev_' || "id", "id", 'PURCHASED', "center_id", "quantity", 'Existing record migrated', COALESCE("purchase_date", "createdAt")
FROM "asset_list";
