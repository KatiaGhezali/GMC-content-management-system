const { query } = require("../config/database");

const User = {
  async create({
    username,
    email,
    passwordHash,
    firstName,
    lastName,
    role = "subscriber",
  }) {
    const sql = `
      INSERT INTO users (
        username, email, password_hash,
        first_name, last_name, role
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, username, email, first_name,
                last_name, role, created_at
    `;

    const values = [username, email, passwordHash, firstName, lastName, role];

    const result = await query(sql, values);
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT user_id, username, email, first_name, last_name,
              role, bio, avatar, is_active, email_verified,
              created_at, updated_at
       FROM users
       WHERE user_id = $1`,
      [id],
    );

    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);

    return result.rows[0] || null;
  },

  async findByUsername(username) {
    const result = await query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    return result.rows[0] || null;
  },

  async findAll({ limit = 10, offset = 0 } = {}) {
    const result = await query(
      `SELECT user_id, username, email, first_name, last_name,
              role, is_active, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return result.rows;
  },

  async update(id, fields) {
    const allowedFields = {
      firstName: "first_name",
      lastName: "last_name",
      bio: "bio",
      avatar: "avatar",
      role: "role",
      isActive: "is_active",
      emailVerified: "email_verified",
    };

    const entries = Object.entries(fields).filter(
      ([key, value]) => allowedFields[key] && value !== undefined,
    );

    if (!entries.length) {
      return this.findById(id);
    }

    const assignments = entries.map(
      ([key], index) => `${allowedFields[key]} = $${index + 1}`,
    );

    const values = entries.map(([, value]) => value);
    values.push(id);

    const result = await query(
      `UPDATE users
       SET ${assignments.join(", ")}
       WHERE user_id = $${values.length}
       RETURNING user_id, username, email, first_name,
                 last_name, role, bio, avatar, is_active`,
      values,
    );

    return result.rows[0] || null;
  },

  async updatePassword(id, passwordHash) {
    const result = await query(
      `UPDATE users
       SET password_hash = $1
       WHERE user_id = $2
       RETURNING user_id`,
      [passwordHash, id],
    );

    return result.rows[0] || null;
  },

  async updateLastLogin(id) {
    await query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1",
      [id],
    );
  },

  async delete(id) {
    const result = await query(
      "DELETE FROM users WHERE user_id = $1 RETURNING user_id",
      [id],
    );

    return result.rows[0] || null;
  },
};

module.exports = User;
