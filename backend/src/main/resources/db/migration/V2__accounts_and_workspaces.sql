CREATE TABLE studio_teachers (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_at VARCHAR(40) NOT NULL
);
CREATE TABLE studio_workspaces (
  owner_id VARCHAR(36) PRIMARY KEY REFERENCES studio_teachers(id),
  revision BIGINT NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  updated_at VARCHAR(40) NOT NULL
);
CREATE TABLE studio_media (
  id VARCHAR(80) NOT NULL,
  owner_id VARCHAR(36) NOT NULL REFERENCES studio_teachers(id),
  content_type VARCHAR(100) NOT NULL,
  byte_size BIGINT NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY(owner_id,id)
);
CREATE TABLE studio_audit (
  id VARCHAR(36) PRIMARY KEY,
  owner_id VARCHAR(36) NOT NULL REFERENCES studio_teachers(id),
  event VARCHAR(100) NOT NULL,
  revision BIGINT,
  created_at VARCHAR(40) NOT NULL
);
