const { query } = require("../config/database");
const { generateSlug } = require("../utils/helpers");

// GET /api/v1/tags
exports.getTags = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.tag_id, t.name, t.slug,
              COUNT(pt.post_id)::int AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.tag_id
       GROUP BY t.tag_id
       ORDER BY t.name`,
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/tags
exports.createTag = async (req, res, next) => {
  try {
    const { name } = req.body;
    const slug = generateSlug(name);

    const result = await query(
      `INSERT INTO tags (name, slug)
       VALUES ($1, $2)
       RETURNING *`,
      [name, slug],
    );

    res.status(201).json({
      success: true,
      message: "Tag created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A tag with this name or slug already exists.",
      });
    }
    next(error);
  }
};

// PUT /api/v1/tags/:id
exports.updateTag = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tag name is required.",
      });
    }

    const result = await query(
      `UPDATE tags
       SET name = $1, slug = $2
       WHERE tag_id = $3
       RETURNING *`,
      [name, generateSlug(name), req.params.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Tag not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tag updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A tag with this name or slug already exists.",
      });
    }
    next(error);
  }
};

// DELETE /api/v1/tags/:id
exports.deleteTag = async (req, res, next) => {
  try {
    const result = await query(
      "DELETE FROM tags WHERE tag_id = $1 RETURNING tag_id",
      [req.params.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Tag not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tag deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
