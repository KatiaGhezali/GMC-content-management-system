const { query } = require("../config/database");

const Category = {
  async create({ name, slug, description, parentId = null }) {
    const result = await query(
      `INSERT INTO categories (name, slug, description, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, slug, description, parentId],
    );

    return result.rows[0];
  },

  async findAll({ activeOnly = true } = {}) {
    const result = await query(
      `SELECT c.*,
              COUNT(p.post_id)::INTEGER AS post_count
       FROM categories c
       LEFT JOIN posts p
         ON c.category_id = p.category_id
         AND p.status = 'published'
       ${activeOnly ? "WHERE c.is_active = TRUE" : ""}
       GROUP BY c.category_id
       ORDER BY c.display_order, c.name`,
    );

    return result.rows;
  },

  async findById(id) {
    const result = await query(
      "SELECT * FROM categories WHERE category_id = $1",
      [id],
    );

    return result.rows[0] || null;
  },

  async update(id, fields) {
    const allowedFields = {
      name: "name",
      slug: "slug",
      description: "description",
      parentId: "parent_id",
      displayOrder: "display_order",
      isActive: "is_active",
    };

    const entries = Object.entries(fields).filter(
      ([key, value]) => allowedFields[key] && value !== undefined,
    );

    if (!entries.length) return this.findById(id);

    const assignments = entries.map(
      ([key], index) => `${allowedFields[key]} = $${index + 1}`,
    );

    const values = entries.map(([, value]) => value);
    values.push(id);

    const result = await query(
      `UPDATE categories
       SET ${assignments.join(", ")}
       WHERE category_id = $${values.length}
       RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query(
      "DELETE FROM categories WHERE category_id = $1 RETURNING category_id",
      [id],
    );

    return result.rows[0] || null;
  },
};

module.exports = Category;
