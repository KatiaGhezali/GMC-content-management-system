const { query } = require("../config/database");

const Comment = {
  async create({
    postId,
    userId = null,
    parentId = null,
    content,
    ipAddress,
    userAgent,
  }) {
    const result = await query(
      `INSERT INTO comments (
        post_id, user_id, parent_id, content,
        ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [postId, userId, parentId, content, ipAddress, userAgent],
    );

    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT cm.*, u.username
       FROM comments cm
       LEFT JOIN users u ON cm.user_id = u.user_id
       WHERE cm.comment_id = $1`,
      [id],
    );

    return result.rows[0] || null;
  },

  async findByPost(postId, { status = "approved" } = {}) {
    const result = await query(
      `SELECT cm.*, u.username
       FROM comments cm
       LEFT JOIN users u ON cm.user_id = u.user_id
       WHERE cm.post_id = $1 AND cm.status = $2
       ORDER BY cm.created_at ASC`,
      [postId, status],
    );

    return result.rows;
  },

  async updateStatus(id, status) {
    const result = await query(
      `UPDATE comments
       SET status = $1
       WHERE comment_id = $2
       RETURNING *`,
      [status, id],
    );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query(
      "DELETE FROM comments WHERE comment_id = $1 RETURNING comment_id",
      [id],
    );

    return result.rows[0] || null;
  },
};

module.exports = Comment;
