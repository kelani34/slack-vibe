CREATE TYPE "UploadIntentStatus" AS ENUM ('PENDING', 'UPLOADED');

ALTER TABLE "attachments"
ALTER COLUMN "url" DROP NOT NULL,
ADD COLUMN "uploadIntentId" TEXT,
ADD CONSTRAINT "attachments_private_url_check"
CHECK ("storagePath" IS NULL OR "url" IS NULL);

CREATE UNIQUE INDEX "attachments_uploadIntentId_key"
ON "attachments"("uploadIntentId");

CREATE TABLE "upload_intents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "UploadIntentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_intents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "upload_intents_size_check" CHECK ("size" > 0),
    CONSTRAINT "upload_intents_expiry_check" CHECK ("expiresAt" > "createdAt")
);

CREATE UNIQUE INDEX "upload_intents_storagePath_key"
ON "upload_intents"("storagePath");

CREATE INDEX "upload_intents_owner_channel_expiry_idx"
ON "upload_intents"("userId", "channelId", "status", "expiresAt");

ALTER TABLE "upload_intents"
ADD CONSTRAINT "upload_intents_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "upload_intents"
ADD CONSTRAINT "upload_intents_channelId_fkey"
FOREIGN KEY ("channelId") REFERENCES "channels"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachments"
ADD CONSTRAINT "attachments_uploadIntentId_fkey"
FOREIGN KEY ("uploadIntentId") REFERENCES "upload_intents"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
