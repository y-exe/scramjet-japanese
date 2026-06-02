CREATE TABLE IF NOT EXISTS scramjet_cookie_states (
  user_hash CHAR(64) PRIMARY KEY,
  cookies JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at_ms BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scramjet_cookie_states_expires
  ON scramjet_cookie_states (expires_at);
