const { query, transaction } = require("../config/database");
const { calculateReadingTime } = require("../utils/helpers");

const Post = {
  async create({
    title,
    slug,
    content,
    excerpt,
    authorId,
    categoryId,
    status = "draft",
    featuredImage,
    metaTitle,
    metaDescription,
    metaKeywords,
    isFeatured = false,
    allowComments = true,
  }) {
    const readingTime = calculateReadingTime(content);

    const publishedAt = status === "published" ? new Date() : null;

    const result = await query(
      `INSERT INTO posts (
        title, slug, content, excerpt, author_id, category_id,
        status, featured_image, meta_title, meta_description,
        meta_keywords, is_featured, allow_comments,
        reading_time, published_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15
      )
      RETURNING *`,
      [
        title,
        slug,
        content,
        excerpt,
        authorId,
        categoryId,
        status,
        featuredImage,
        metaTitle,
        metaDescription,
        metaKeywords,
        isFeatured,
        allowComments,
        readingTime,
        publishedAt,
      ],
    );

    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT p.*, u.username AS author_name,
              c.name AS category_name
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.post_id = $1`,
      [id],
    );

    return result.rows[0] || null;
  },

  async findBySlug(slug) {
    const result = await query(
      `SELECT p.*, u.username AS author_name,
              c.name AS category_name
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.slug = $1`,
      [slug],
    );

    return result.rows[0] || null;
  },

  async findAll({
    limit = 10,
    offset = 0,
    status,
    categoryId,
    authorId,
    search,
  } = {}) {
    const conditions = [];
    const values = [];

    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (status) addCondition("p.status = ?", status);
    if (categoryId) addCondition("p.category_id = ?", categoryId);
    if (authorId) addCondition("p.author_id = ?", authorId);

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(p.title ILIKE $${values.length} OR p.content ILIKE $${values.length})`,
      );
    }

    values.push(limit);
    const limitParam = `$${values.length}`;

    values.push(offset);
    const offsetParam = `$${values.length}`;

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await query(
      `SELECT p.*, u.username AS author_name,
              c.name AS category_name
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );

    return result.rows;
  },

  async update(id, fields) {
    const allowedFields = {
      title: "title",
      slug: "slug",
      content: "content",
      excerpt: "excerpt",
      categoryId: "category_id",
      status: "status",
      featuredImage: "featured_image",
      metaTitle: "meta_title",
      metaDescription: "meta_description",
      metaKeywords: "meta_keywords",
      isFeatured: "is_featured",
      allowComments: "allow_comments",
    };

    const entries = Object.entries(fields).filter(
      ([key, value]) => allowedFields[key] && value !== undefined,
    );

    if (fields.content !== undefined) {
      entries.push(["readingTime", calculateReadingTime(fields.content)]);
      allowedFields.readingTime = "reading_time";
    }

    if (fields.status === "published") {
      entries.push(["publishedAt", new Date()]);
      allowedFields.publishedAt = "published_at";
    }

    if (!entries.length) return this.findById(id);

    const assignments = entries.map(
      ([key], index) => `${allowedFields[key]} = $${index + 1}`,
    );

    const values = entries.map(([, value]) => value);
    values.push(id);

    const result = await query(
      `UPDATE posts
       SET ${assignments.join(", ")}
       WHERE post_id = $${values.length}
       RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query(
      "DELETE FROM posts WHERE post_id = $1 RETURNING post_id",
      [id],
    );

    return result.rows[0] || null;
  },

  async incrementViews(id) {
    const result = await query(
      `UPDATE posts
       SET view_count = view_count + 1
       WHERE post_id = $1
       RETURNING view_count`,
      [id],
    );

    return result.rows[0] || null;
  },

  async setTags(postId, tagIds) {
    return transaction(async (client) => {
      await client.query("DELETE FROM post_tags WHERE post_id = $1", [postId]);

      for (const tagId of tagIds) {
        await client.query(
          `INSERT INTO post_tags (post_id, tag_id)
           VALUES ($1, $2)`,
          [postId, tagId],
        );
      }

      return true;
    });
  },

  async findTags(postId) {
    const result = await query(
      `SELECT t.*
       FROM tags t
       JOIN post_tags pt ON t.tag_id = pt.tag_id
       WHERE pt.post_id = $1
       ORDER BY t.name`,
      [postId],
    );

    return result.rows;
  },
};

module.exports = Post;
