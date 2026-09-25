CREATE INDEX "notifications_user_activity_idx"
ON "notifications" ("userId", "createdAt" DESC, "id" DESC);

CREATE INDEX "notifications_user_read_idx"
ON "notifications" ("userId", "isRead");
