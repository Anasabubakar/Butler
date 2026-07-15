-- Connector SDK: OAuth connection vault + CSRF state for connect flows.

CREATE TABLE IF NOT EXISTS oauth_connections (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL,
    provider            TEXT NOT NULL,
    account_label       TEXT NOT NULL DEFAULT '',
    account_id          TEXT NOT NULL DEFAULT '',
    scopes              TEXT NOT NULL DEFAULT '',
    access_token_enc    TEXT NOT NULL DEFAULT '',
    refresh_token_enc   TEXT NOT NULL DEFAULT '',
    token_type          TEXT NOT NULL DEFAULT 'Bearer',
    expires_at          TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    status              TEXT NOT NULL DEFAULT 'connected',
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_connections_user ON oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_provider ON oauth_connections(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_status ON oauth_connections(user_id, status);

CREATE TABLE IF NOT EXISTS oauth_states (
    state       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    provider    TEXT NOT NULL,
    redirect_to TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);
