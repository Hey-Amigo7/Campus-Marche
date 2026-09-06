-- Messaging v2: reply threading, edit/delete, reactions, conversation preferences

-- ── Message: new fields ──────────────────────────────────────────────────────
ALTER TABLE "Message" ADD COLUMN "replyToId"  TEXT;
ALTER TABLE "Message" ADD COLUMN "editedAt"   TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deletedAt"  TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deletedFor" TEXT[] NOT NULL DEFAULT '{}';

-- Self-referential FK for threading
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Composite index for cursor-based pagination
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- ── MessageReaction ──────────────────────────────────────────────────────────
CREATE TABLE "MessageReaction" (
  "id"        TEXT NOT NULL,
  "emoji"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "messageId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_key" ON "MessageReaction"("messageId", "userId");
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ConversationPreference ───────────────────────────────────────────────────
CREATE TABLE "ConversationPreference" (
  "id"             TEXT NOT NULL,
  "muted"          BOOLEAN NOT NULL DEFAULT false,
  "pinned"         BOOLEAN NOT NULL DEFAULT false,
  "archived"       BOOLEAN NOT NULL DEFAULT false,
  "userId"         TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  CONSTRAINT "ConversationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationPreference_userId_conversationId_key"
  ON "ConversationPreference"("userId", "conversationId");
CREATE INDEX "ConversationPreference_userId_idx" ON "ConversationPreference"("userId");

ALTER TABLE "ConversationPreference" ADD CONSTRAINT "ConversationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationPreference" ADD CONSTRAINT "ConversationPreference_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
