-- Esquema PostgreSQL para cuando el ranking supere lo que aguanta el archivo JSON.
CREATE TABLE players (
  id        CHAR(16) PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,          -- sha256(id:token); el token jamás se guarda
  name      VARCHAR(16) NOT NULL DEFAULT 'Piloto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE scores (
  id        BIGSERIAL PRIMARY KEY,
  player_id CHAR(16) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score     INTEGER NOT NULL CHECK (score >= 0),
  level     SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 10),
  kills     INTEGER NOT NULL,
  seconds   INTEGER NOT NULL,
  client_ts BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, client_ts)
);
CREATE INDEX scores_rank_idx ON scores (score DESC);
