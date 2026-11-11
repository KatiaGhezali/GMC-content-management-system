const { query } = require("../config/database");
const { generateSlug } = require("../utils/helpers");

// GET /api/v1/categories
exports.getCategories = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.category_id, c.name, c.slug, c.description,
              c.parent_id, c.is_active,
              COUNT(p.post_id) FILTER (
                WHERE p.status = 'published'
              )::int AS published_post_count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.category_id
       WHERE c.is_active = TRUE
       GROUP BY c.category_id
       ORDER BY c.name`,
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/categories
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, parentId } = req.body;
    const slug = generateSlug(name);

    const result = await query(
      `INSERT INTO categories (name, slug, description, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, slug, description || null, parentId || null],
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this name or slug already exists.",
      });
    }
    next(error);
  }
};

// PUT /api/v1/categories/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, parentId, isActive } = req.body;

    const fields = [];
    const values = [];

    const addField = (column, value) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (name !== undefined) {
      addField("name", name);
      addField("slug", generateSlug(name));
    }

    if (description !== undefined) addField("description", description);
    if (parentId !== undefined) addField("parent_id", parentId || null);
    if (isActive !== undefined) addField("is_active", isActive);

    if (!fields.length) {
      return res.status(400).json({
        success: false,
        message: "No category fields were provided.",
      });
    }

    values.push(req.params.id);

    const result = await query(
      `UPDATE categories
       SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE category_id = $${values.length}
       RETURNING *`,
      values,
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this name or slug already exists.",
      });
    }
    next(error);
  }
};

// DELETE /api/v1/categories/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await query(
      "DELETE FROM categories WHERE category_id = $1 RETURNING category_id",
      [req.params.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
