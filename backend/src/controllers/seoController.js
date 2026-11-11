const { query } = require("../config/database");
const { buildSeoMetadata } = require("../utils/seo");

// GET /api/v1/seo/posts/:slug
exports.getPostSeo = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT post_id, title, slug, content, excerpt,
              seo_title, meta_description, meta_keywords,
              canonical_url, og_title, og_description, og_image
       FROM posts
       WHERE slug = $1 AND status = 'published'`,
      [req.params.slug],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Published post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: buildSeoMetadata(result.rows[0]),
    });
  } catch (error) {
    next(error);
  }
};
