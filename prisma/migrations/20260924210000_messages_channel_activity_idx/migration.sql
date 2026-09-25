-- Supports unread-count ranges and latest-message lookups by conversation.
CREATE INDEX "messages_channel_activity_idx"
ON "messages"("channelId", "createdAt" DESC, "id" DESC);
