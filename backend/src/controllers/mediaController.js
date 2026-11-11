const fs = require("fs/promises");
const path = require("path");

const { query } = require("../config/database");

const uploadDirectory = path.resolve(__dirname, "../../uploads");

const canManageMedia = (user, media) =>
  user.role === "admin" ||
  user.role === "editor" ||
  media.uploaded_by === user.userId;

// POST /api/v1/media
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file to upload.",
      });
    }

    const result = await query(
      `INSERT INTO media
        (filename, original_name, mime_type, file_size,
         file_path, uploaded_by, alt_text, caption)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        `/uploads/${req.file.filename}`,
        req.user.userId,
        req.body.altText || null,
        req.body.caption || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
};

// GET /api/v1/media
exports.getMedia = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    if (req.user.role === "author") {
      values.push(req.user.userId);
      conditions.push(`uploaded_by = $${values.length}`);
    }

    if (req.query.search) {
      values.push(`%${req.query.search.trim()}%`);
      conditions.push(
        `(original_name ILIKE $${values.length} OR caption ILIKE $${values.length})`,
      );
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM media ${whereClause}`,
      values,
    );

    const result = await query(
      `SELECT m.*, u.username AS uploader_username
       FROM media m
       LEFT JOIN users u ON u.user_id = m.uploaded_by
       ${whereClause.replaceAll("uploaded_by", "m.uploaded_by").replaceAll("original_name", "m.original_name").replaceAll("caption", "m.caption")}
       ORDER BY m.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/media/:id
exports.getMediaById = async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM media WHERE media_id = $1", [
      req.params.id,
    ]);

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    const media = result.rows[0];

    if (!canManageMedia(req.user, media)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this media record.",
      });
    }

    return res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/media/:id
exports.updateMedia = async (req, res, next) => {
  try {
    const existing = await query("SELECT * FROM media WHERE media_id = $1", [
      req.params.id,
    ]);

    if (!existing.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    const media = existing.rows[0];

    if (!canManageMedia(req.user, media)) {
      return res.status(403).json({
        success: false,
        message: "You cannot edit this media.",
      });
    }

    const { altText, caption } = req.body;

    const result = await query(
      `UPDATE media
       SET alt_text = $1, caption = $2
       WHERE media_id = $3
       RETURNING *`,
      [
        altText !== undefined ? altText : media.alt_text,
        caption !== undefined ? caption : media.caption,
        req.params.id,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Media details updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/media/:id
exports.deleteMedia = async (req, res, next) => {
  try {
    const existing = await query("SELECT * FROM media WHERE media_id = $1", [
      req.params.id,
    ]);

    if (!existing.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    const media = existing.rows[0];

    if (!canManageMedia(req.user, media)) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this media.",
      });
    }

    const filename = path.basename(media.filename);
    const filePath = path.join(uploadDirectory, filename);

    await query("DELETE FROM media WHERE media_id = $1", [req.params.id]);

    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });

    return res.status(200).json({
      success: true,
      message: "Media deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
