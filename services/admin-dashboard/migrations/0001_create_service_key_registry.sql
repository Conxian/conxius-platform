-- Neon-backed M2M service-key registry (M2M_KEY_STORE_BACKEND=neon).
-- Stores a single-row registry document per environment. The JSONB document
-- mirrors the file-backed registry shape (schemaVersion, revision, lastCommitId,
-- services, notificationState, auditEvents). Writers serialize on the row lock
-- (SELECT ... FOR UPDATE) inside the store's mutation transactions.

CREATE TABLE IF NOT EXISTS service_key_registry (
  id         TEXT PRIMARY KEY DEFAULT 'default',
  document   JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
