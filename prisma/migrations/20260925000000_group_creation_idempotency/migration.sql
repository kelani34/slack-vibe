ALTER TABLE "channels"
ADD COLUMN "creationMutationId" TEXT,
ADD COLUMN "creationRequestHash" TEXT;

CREATE UNIQUE INDEX "channels_creation_mutation_id_key"
ON "channels"("creationMutationId");
