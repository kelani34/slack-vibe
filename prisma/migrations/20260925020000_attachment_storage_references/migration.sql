ALTER TABLE "attachments"
ADD COLUMN "storageBucket" TEXT,
ADD COLUMN "storagePath" TEXT;

ALTER TABLE "attachments"
ADD CONSTRAINT "attachments_storage_locator_pair"
CHECK (("storageBucket" IS NULL) = ("storagePath" IS NULL));

CREATE UNIQUE INDEX "attachments_storage_locator_key"
ON "attachments"("storageBucket", "storagePath");
