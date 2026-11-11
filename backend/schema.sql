-- =====================================================
-- EduCMS DATABASE SCHEMA
-- PostgreSQL
-- =====================================================

-- Drop existing tables (fresh database only)
DROP VIEW IF EXISTS user_statistics;
DROP VIEW IF EXISTS post_statistics;

DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'subscriber'
        CHECK (role IN ('admin', 'editor', 'author', 'subscriber')),
    bio TEXT,
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255)
);

-- =====================================================
-- CATEGORIES
-- =====================================================

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES categories(category_id)
        ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- POSTS
-- =====================================================

CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    author_id INTEGER REFERENCES users(user_id)
        ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(category_id)
        ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    featured_image VARCHAR(500),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    reading_time INTEGER DEFAULT 1,
    CONSTRAINT published_post_has_date
        CHECK (status <> 'published' OR published_at IS NOT NULL)
);

-- =====================================================
-- TAGS
-- =====================================================

CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- POST TAGS (MANY-TO-MANY)
-- =====================================================

CREATE TABLE post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(post_id)
        ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(tag_id)
        ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- =====================================================
-- COMMENTS
-- =====================================================

CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id)
        ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id)
        ON DELETE SET NULL,
    parent_id INTEGER REFERENCES comments(comment_id)
        ON DELETE CASCADE,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'spam', 'trash')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MEDIA
-- =====================================================

CREATE TABLE media (
    media_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    mime_type VARCHAR(150),
    uploaded_by INTEGER REFERENCES users(user_id)
        ON DELETE SET NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ACTIVITY LOG
-- =====================================================

CREATE TABLE activity_log (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id)
        ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at);
CREATE INDEX idx_posts_featured ON posts(is_featured);

CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_status ON comments(status);

CREATE INDEX idx_tags_slug ON tags(slug);

CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_file_type ON media(file_type);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

CREATE VIEW post_statistics AS
SELECT
    p.post_id,
    p.title,
    p.status,
    p.view_count,
    p.like_count,
    p.created_at,
    p.published_at,
    u.username AS author,
    c.name AS category,
    COUNT(DISTINCT cm.comment_id) AS comment_count
FROM posts p
LEFT JOIN users u ON p.author_id = u.user_id
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN comments cm
    ON p.post_id = cm.post_id AND cm.status = 'approved'
GROUP BY p.post_id, u.username, c.name;

CREATE VIEW user_statistics AS
SELECT
    u.user_id,
    u.username,
    u.email,
    u.role,
    COUNT(DISTINCT p.post_id) AS post_count,
    COUNT(DISTINCT cm.comment_id) AS comment_count
FROM users u
LEFT JOIN posts p ON u.user_id = p.author_id
LEFT JOIN comments cm ON u.user_id = cm.user_id
GROUP BY u.user_id;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_category_post_count(cat_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COUNT(*) INTO total
    FROM posts
    WHERE category_id = cat_id
      AND status = 'published';

    RETURN total;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_reading_time(post_content TEXT)
RETURNS INTEGER AS $$
DECLARE
    word_count INTEGER;
BEGIN
    SELECT array_length(
        regexp_split_to_array(trim(post_content), '\s+'), 1
    ) INTO word_count;

    RETURN GREATEST(1, CEIL(COALESCE(word_count, 0)::DECIMAL / 200));
END;
$$ LANGUAGE plpgsql;