-- Add SEO metadata to posts.
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_description VARCHAR(320),
ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS og_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS og_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Ensure every post has a view counter.
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

-- Add the same SEO fields to post revisions.
ALTER TABLE post_revisions
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_description VARCHAR(320),
ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS og_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS og_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Store daily unique post views.
-- visitor_hash is an HMAC hash, not the visitor's raw IP address.
CREATE TABLE IF NOT EXISTS post_views (
    view_id BIGSERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    visitor_hash CHAR(64) NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT unique_daily_post_visitor
        UNIQUE (post_id, visitor_hash, view_date)
);

CREATE INDEX IF NOT EXISTS idx_post_views_post_date
ON post_views(post_id, view_date);

CREATE INDEX IF NOT EXISTS idx_post_views_date
ON post_views(view_date);

CREATE INDEX IF NOT EXISTS idx_posts_views
ON posts(views DESC);

-- Useful for SEO/public post lookups.
CREATE INDEX IF NOT EXISTS idx_posts_published_slug
ON posts(slug)
WHERE status = 'published';