const { query } = require("../config/database");

const Tag = {
  async create({ name, slug, description }) {
    const result = await query(
      `INSERT INTO tags (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, description],
    );

    return result.rows[0];
  },

  async findAll() {
    const result = await query(
      `SELECT t.*, COUNT(pt.post_id)::INTEGER AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON t.tag_id = pt.tag_id
       GROUP BY t.tag_id
       ORDER BY t.name`,
    );

    return result.rows;
  },

  async findById(id) {
    const result = await query("SELECT * FROM tags WHERE tag_id = $1", [id]);

    return result.rows[0] || null;
  },

  async update(id, { name, slug, description }) {
    const result = await query(
      `UPDATE tags
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           description = COALESCE($3, description)
       WHERE tag_id = $4
       RETURNING *`,
      [name, slug, description, id],
    );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query(
      "DELETE FROM tags WHERE tag_id = $1 RETURNING tag_id",
      [id],
    );

    return result.rows[0] || null;
  },
};

module.exports = Tag;
