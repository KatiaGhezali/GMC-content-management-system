const { query, transaction } = require("../config/database");

const canAccessPost = (user, post) =>
  user.role === "admin" ||
  user.role === "editor" ||
  (user.role === "author" && Number(post.author_id) === Number(user.userId));

const getPost = async (postId) => {
  const result = await query(
    `SELECT *
     FROM posts
     WHERE post_id = $1`,
    [postId],
  );

  return result.rows[0] || null;
};

// GET /api/v1/posts/:postId/revisions
exports.getRevisions = async (req, res, next) => {
  try {
    const post = await getPost(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (!canAccessPost(req.user, post)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this post's revisions.",
      });
    }

    const result = await query(
      `SELECT r.revision_id, r.post_id, r.revision_number,
              r.title, r.slug, r.excerpt, r.status,
              r.created_by, r.created_at,
              u.username AS creator_username
       FROM post_revisions r
       LEFT JOIN users u ON u.user_id = r.created_by
       WHERE r.post_id = $1
       ORDER BY r.revision_number DESC`,
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

// GET /api/v1/posts/:postId/revisions/:revisionId
exports.getRevision = async (req, res, next) => {
  try {
    const post = await getPost(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (!canAccessPost(req.user, post)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this revision.",
      });
    }

    const result = await query(
      `SELECT *
       FROM post_revisions
       WHERE revision_id = $1 AND post_id = $2`,
      [req.params.revisionId, req.params.postId],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Revision not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/posts/:postId/revisions/:revisionId/restore
exports.restoreRevision = async (req, res, next) => {
  try {
    const post = await getPost(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (!canAccessPost(req.user, post)) {
      return res.status(403).json({
        success: false,
        message: "You cannot restore this post.",
      });
    }

    const revisionResult = await query(
      `SELECT *
       FROM post_revisions
       WHERE revision_id = $1 AND post_id = $2`,
      [req.params.revisionId, req.params.postId],
    );

    if (!revisionResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Revision not found.",
      });
    }

    const revision = revisionResult.rows[0];

    // Authors may restore drafts only.
    if (req.user.role === "author" && revision.status !== "draft") {
      return res.status(403).json({
        success: false,
        message: "Authors can only restore draft revisions.",
      });
    }

    const updatedPost = await transaction(async (client) => {
      // Lock the post so two edits/restores cannot overwrite each other.
      const currentResult = await client.query(
        `SELECT *
         FROM posts
         WHERE post_id = $1
         FOR UPDATE`,
        [post.post_id],
      );

      const currentPost = currentResult.rows[0];

      if (!currentPost) {
        throw Object.assign(new Error("Post not found."), {
          status: 404,
        });
      }

      // Save the current state, including SEO metadata, before restoring.
      await client.query(
        `INSERT INTO post_revisions
          (post_id, title, slug, content, excerpt, category_id,
           status, published_at, revision_number, created_by,
           seo_title, meta_description, meta_keywords, canonical_url,
           og_title, og_description, og_image)
         SELECT
           $1, $2, $3, $4, $5, $6, $7, $8,
           COALESCE(
             (SELECT MAX(revision_number) + 1
              FROM post_revisions
              WHERE post_id = $1),
             1
           ),
           $9, $10, $11, $12, $13, $14, $15, $16`,
        [
          currentPost.post_id,
          currentPost.title,
          currentPost.slug,
          currentPost.content,
          currentPost.excerpt,
          currentPost.category_id,
          currentPost.status,
          currentPost.published_at,
          req.user.userId,
          currentPost.seo_title,
          currentPost.meta_description,
          currentPost.meta_keywords,
          currentPost.canonical_url,
          currentPost.og_title,
          currentPost.og_description,
          currentPost.og_image,
        ],
      );

      // Restore the selected revision, including its SEO metadata.
      const result = await client.query(
        `UPDATE posts
         SET title = $1,
             slug = $2,
             content = $3,
             excerpt = $4,
             category_id = $5,
             status = $6,
             published_at = $7,
             seo_title = $8,
             meta_description = $9,
             meta_keywords = $10,
             canonical_url = $11,
             og_title = $12,
             og_description = $13,
             og_image = $14,
             updated_at = CURRENT_TIMESTAMP
         WHERE post_id = $15
         RETURNING *`,
        [
          revision.title,
          `${revision.slug}-restored-${Date.now()}`,
          revision.content,
          revision.excerpt,
          revision.category_id,
          revision.status,
          revision.status === "published"
            ? revision.published_at || new Date()
            : null,
          revision.seo_title,
          revision.meta_description,
          revision.meta_keywords,
          revision.canonical_url,
          revision.og_title,
          revision.og_description,
          revision.og_image,
          post.post_id,
        ],
      );

      return result.rows[0];
    });

    return res.status(200).json({
      success: true,
      message: "Post revision restored successfully.",
      data: updatedPost,
    });
  } catch (error) {
    next(error);
  }
};
