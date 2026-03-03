CREATE TABLE IF NOT EXISTS community_blocks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id VARCHAR NOT NULL,
  blocked_id VARCHAR NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_blocks_unique ON community_blocks(blocker_id, blocked_id);
