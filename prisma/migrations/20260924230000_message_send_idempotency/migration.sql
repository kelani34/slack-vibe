ALTER TABLE "messages"
ADD COLUMN "clientMutationId" TEXT,
ADD COLUMN "requestHash" TEXT;

CREATE UNIQUE INDEX "messages_user_client_mutation_id_key"
ON "messages"("userId", "clientMutationId");
