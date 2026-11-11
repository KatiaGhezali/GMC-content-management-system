const { query } = require("../config/database");

const Media = {
  async create({
    filename,
    originalName,
    filePath,
    fileType,
    fileSize,
    mimeType,
    uploadedBy,
    altText,
    caption,
    width,
    height,
  }) {
    const result = await query(
      `INSERT INTO media (
        filename, original_name, file_path, file_type,
        file_size, mime_type, uploaded_by, alt_text,
        caption, width, height
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        filename,
        originalName,
        filePath,
        fileType,
        fileSize,
        mimeType,
        uploadedBy,
        altText,
        caption,
        width,
        height,
      ],
    );

    return result.rows[0];
  },

  async findById(id) {
    const result = await query("SELECT * FROM media WHERE media_id = $1", [id]);

    return result.rows[0] || null;
  },

  async findAll({ limit = 10, offset = 0, uploadedBy } = {}) {
    const result = await query(
      `SELECT *
       FROM media
       ${uploadedBy ? "WHERE uploaded_by = $3" : ""}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      uploadedBy ? [limit, offset, uploadedBy] : [limit, offset],
    );

    return result.rows;
  },

  async updateDetails(id, { altText, caption }) {
    const result = await query(
      `UPDATE media
       SET alt_text = COALESCE($1, alt_text),
           caption = COALESCE($2, caption)
       WHERE media_id = $3
       RETURNING *`,
      [altText, caption, id],
    );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await query(
      "DELETE FROM media WHERE media_id = $1 RETURNING *",
      [id],
    );

    return result.rows[0] || null;
  },
};

module.exports = Media;
