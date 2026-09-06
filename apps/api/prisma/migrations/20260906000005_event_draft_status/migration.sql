-- Event draft lifecycle: status, creatorId

ALTER TABLE "CampusEvent" ADD COLUMN "status"    TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "CampusEvent" ADD COLUMN "creatorId" TEXT;

ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CampusEvent_status_idx"    ON "CampusEvent"("status");
CREATE INDEX "CampusEvent_creatorId_idx" ON "CampusEvent"("creatorId");
