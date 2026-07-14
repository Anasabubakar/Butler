CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chat_threads (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    subtitle    TEXT NOT NULL DEFAULT '',
    tag         TEXT NOT NULL DEFAULT '',
    tone        TEXT NOT NULL DEFAULT '',
    last_message_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_threads_user ON chat_threads(user_id);
CREATE INDEX idx_chat_threads_updated ON chat_threads(updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          TEXT PRIMARY KEY,
    thread_id   TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    text        TEXT NOT NULL DEFAULT '',
    mode        TEXT NOT NULL DEFAULT 'general',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '',
    tag         TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);

CREATE TABLE IF NOT EXISTS delegations (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    service     TEXT NOT NULL DEFAULT '',
    context     TEXT NOT NULL DEFAULT '',
    draft       TEXT NOT NULL DEFAULT '',
    tone        TEXT NOT NULL DEFAULT '',
    tone_label  TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'awaiting',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delegations_user ON delegations(user_id);
CREATE INDEX idx_delegations_status ON delegations(user_id, status);

CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL DEFAULT '',
    source      TEXT NOT NULL DEFAULT '',
    tone        TEXT NOT NULL DEFAULT '',
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

CREATE TABLE IF NOT EXISTS user_settings (
    user_id             TEXT PRIMARY KEY,
    theme               TEXT NOT NULL DEFAULT 'system',
    chat_mode           TEXT NOT NULL DEFAULT 'general',
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    warmth              INTEGER NOT NULL DEFAULT 72,
    formality           INTEGER NOT NULL DEFAULT 55,
    brevity             INTEGER NOT NULL DEFAULT 80,
    location_auto_detect BOOLEAN NOT NULL DEFAULT TRUE,
    location_text       TEXT NOT NULL DEFAULT '',
    integrations        JSONB
);
