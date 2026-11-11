-- =========================================
-- MEDIA TABLE ADJUSTMENTS
-- =========================================

ALTER TABLE media
    ADD COLUMN IF NOT EXISTS filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS original_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS file_size BIGINT,
    ADD COLUMN IF NOT EXISTS file_path TEXT,
    ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES users(user_id)
        ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS alt_text VARCHAR(500),
    ADD COLUMN IF NOT EXISTS caption TEXT;

CREATE INDEX IF NOT EXISTS idx_media_uploaded_by
    ON media(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_media_created_at
    ON media(created_at);


-- =========================================
-- POST REVISIONS
-- =========================================

CREATE TABLE IF NOT EXISTS post_revisions (
    revision_id SERIAL PRIMARY KEY,

    post_id INTEGER NOT NULL
        REFERENCES posts(post_id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,

    category_id INTEGER
        REFERENCES categories(category_id)
        ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL
        CHECK (status IN ('draft', 'published', 'archived')),

    published_at TIMESTAMP,

    revision_number INTEGER NOT NULL,

    created_by INTEGER
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(post_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_post_revisions_post
    ON post_revisions(post_id);

CREATE INDEX IF NOT EXISTS idx_post_revisions_created_at
    ON post_revisions(created_at DESC);