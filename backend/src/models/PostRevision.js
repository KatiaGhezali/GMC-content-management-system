const { query } = require("../config/database");

class PostRevision {
  static async create(post, createdBy) {
    const numberResult = await query(
      `SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_number
       FROM post_revisions
       WHERE post_id = $1`,
      [post.post_id],
    );

    const revisionNumber = numberResult.rows[0].next_number;

    const result = await query(
      `INSERT INTO post_revisions
        (post_id, title, slug, content, excerpt, category_id,
         status, published_at, revision_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        post.post_id,
        post.title,
        post.slug,
        post.content,
        post.excerpt,
        post.category_id,
        post.status,
        post.published_at,
        revisionNumber,
        createdBy,
      ],
    );

    return result.rows[0];
  }

  static async findByPost(postId) {
    const result = await query(
      `SELECT r.revision_id, r.post_id, r.revision_number,
              r.title, r.slug, r.excerpt, r.status,
              r.created_by, r.created_at,
              u.username AS creator_username
       FROM post_revisions r
       LEFT JOIN users u ON u.user_id = r.created_by
       WHERE r.post_id = $1
       ORDER BY r.revision_number DESC`,
      [postId],
    );

    return result.rows;
  }

  static async findById(revisionId) {
    const result = await query(
      "SELECT * FROM post_revisions WHERE revision_id = $1",
      [revisionId],
    );

    return result.rows[0] || null;
  }
}

module.exports = PostRevision;
