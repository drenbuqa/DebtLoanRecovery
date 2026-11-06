CREATE TABLE hr_documents (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(200) NOT NULL,
  description    VARCHAR(500),
  file_name      VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  file_size      INT          NOT NULL,
  file_data      BYTEA        NOT NULL,
  uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  uploaded_by_id UUID         NOT NULL REFERENCES users(id)
);

CREATE TABLE confidentiality_acceptances (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        UNIQUE NOT NULL REFERENCES users(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version     VARCHAR(20) NOT NULL DEFAULT '1.0'
);
