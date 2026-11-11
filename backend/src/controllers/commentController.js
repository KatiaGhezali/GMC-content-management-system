const { query } = require("../config/database");

// GET /api/v1/comments/post/:postId
exports.getPostComments = async (req, res, next) => {
  try {
    const post = await query(
      "SELECT post_id, status FROM posts WHERE post_id = $1",
      [req.params.postId],
    );

    if (!post.rows.length || post.rows[0].status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const result = await query(
      `SELECT c.comment_id, c.post_id,
              c.parent_id AS parent_comment_id,
              c.content, c.status, c.created_at,
              u.username
       FROM comments c
       LEFT JOIN users u ON u.user_id = c.user_id
       WHERE c.post_id = $1 AND c.status = 'approved'
       ORDER BY c.created_at ASC`,
      [req.params.postId],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/comments
exports.createComment = async (req, res, next) => {
  try {
    const { postId, content, parentCommentId } = req.body;

    const post = await query(
      `SELECT post_id, status
       FROM posts
       WHERE post_id = $1 AND status = 'published'`,
      [postId],
    );

    if (!post.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Published post not found.",
      });
    }

    if (parentCommentId) {
      const parent = await query(
        `SELECT comment_id
         FROM comments
         WHERE comment_id = $1
           AND post_id = $2
           AND status = 'approved'`,
        [parentCommentId, postId],
      );

      if (!parent.rows.length) {
        return res.status(400).json({
          success: false,
          message: "The parent comment is invalid.",
        });
      }
    }

    const result = await query(
      `INSERT INTO comments
        (post_id, user_id, parent_id, content, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING comment_id, post_id, user_id,
                 parent_id AS parent_comment_id,
                 content, status, created_at`,
      [
        postId,
        req.user ? req.user.userId : null,
        parentCommentId || null,
        content,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Comment submitted and awaiting moderation.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/comments/moderation
exports.getCommentsForModeration = async (req, res, next) => {
  try {
    const status = req.query.status || "pending";
    const allowed = ["pending", "approved", "spam", "trash"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment status.",
      });
    }

    const result = await query(
      `SELECT c.comment_id, c.post_id, c.user_id,
              c.parent_id AS parent_comment_id,
              c.content, c.status, c.created_at,
              u.username, p.title AS post_title
       FROM comments c
       LEFT JOIN users u ON u.user_id = c.user_id
       INNER JOIN posts p ON p.post_id = c.post_id
       WHERE c.status = $1
       ORDER BY c.created_at ASC`,
      [status],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/comments/:id/status
exports.updateCommentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "approved", "spam", "trash"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment status.",
      });
    }

    const result = await query(
      `UPDATE comments
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE comment_id = $2
       RETURNING *`,
      [status, req.params.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment status updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/comments/:id
exports.deleteComment = async (req, res, next) => {
  try {
    const result = await query(
      "DELETE FROM comments WHERE comment_id = $1 RETURNING comment_id",
      [req.params.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
