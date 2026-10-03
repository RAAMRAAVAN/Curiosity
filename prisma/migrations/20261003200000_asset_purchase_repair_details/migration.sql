ALTER TABLE "asset_list"
    ADD COLUMN "vendor" TEXT,
    ADD COLUMN "invoice_number" TEXT,
    ADD COLUMN "warranty_expiry" TIMESTAMP(3);

ALTER TABLE "asset_events"
    ADD COLUMN "vendor" TEXT,
    ADD COLUMN "cost" DECIMAL(12,2);
