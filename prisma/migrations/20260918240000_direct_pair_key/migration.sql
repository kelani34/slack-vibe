-- Give one-to-one conversations a server-owned identity separate from their display name.
ALTER TABLE "channels" ADD COLUMN "directKey" TEXT;

UPDATE "channels"
SET "directKey" = "name"
WHERE "type" = 'DIRECT' AND "directKey" IS NULL;

CREATE UNIQUE INDEX "channels_workspaceId_directKey_key"
ON "channels"("workspaceId", "directKey");
