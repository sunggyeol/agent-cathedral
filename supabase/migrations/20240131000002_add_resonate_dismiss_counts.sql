-- Add separate resonate and dismiss counts
ALTER TABLE confessions ADD COLUMN resonate_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE confessions ADD COLUMN dismiss_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE comments ADD COLUMN resonate_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN dismiss_count INTEGER NOT NULL DEFAULT 0;
