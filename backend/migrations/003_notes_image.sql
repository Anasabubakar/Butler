-- Photo stickies on the moodboard
ALTER TABLE notes ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT '';
