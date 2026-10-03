CREATE TYPE "AssetCondition" AS ENUM ('GOOD', 'FAIR', 'NEEDS_REPAIR', 'DAMAGED');

CREATE TABLE "item_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_categories_name_key" ON "item_categories"("name");

CREATE TABLE "item_masters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "manufacturer" TEXT,
    "model_number" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "item_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_masters_category_id_name_key" ON "item_masters"("category_id", "name");
CREATE INDEX "item_masters_category_id_status_idx" ON "item_masters"("category_id", "status");

CREATE TABLE "asset_list" (
    "id" TEXT NOT NULL,
    "item_master_id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "asset_tag" TEXT,
    "serial_number" TEXT,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_cost" DECIMAL(12,2),
    "notes" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "asset_list_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_list_asset_tag_key" ON "asset_list"("asset_tag");
CREATE INDEX "asset_list_center_id_status_idx" ON "asset_list"("center_id", "status");
CREATE INDEX "asset_list_item_master_id_status_idx" ON "asset_list"("item_master_id", "status");

ALTER TABLE "item_masters"
ADD CONSTRAINT "item_masters_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "item_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asset_list"
ADD CONSTRAINT "asset_list_item_master_id_fkey"
FOREIGN KEY ("item_master_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "asset_list"
ADD CONSTRAINT "asset_list_center_id_fkey"
FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;