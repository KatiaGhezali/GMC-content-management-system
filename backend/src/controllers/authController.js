const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { query } = require("../config/database");
const User = require("../models/User");
const logger = require("../utils/logger");

const getTokenExpiryDate = () => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRE || "7d";
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error("Invalid JWT_REFRESH_EXPIRE configuration.");
  }

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + Number(match[1]) * units[match[2]]);
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const generateAccessToken = (user) =>
  jwt.sign(
    {
      userId: user.user_id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "15m",
    },
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    {
      userId: user.user_id,
      tokenType: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
    },
  );

const saveRefreshToken = async (userId, token) => {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), getTokenExpiryDate()],
  );
};

const createTokenPair = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await saveRefreshToken(user.user_id, refreshToken);

  return { accessToken, refreshToken };
};

// register
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    const existingEmail = await User.findByEmail(email);

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const existingUsername = await User.findByUsername(username);

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: "This username is already taken.",
      });
    }

    const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const passwordHash = await bcrypt.hash(password, rounds);

    // Public registration always creates a subscriber.
    // Privileged roles must be assigned by an administrator.
    const user = await User.create({
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: "subscriber",
    });

    const tokens = await createTokenPair(user);

    logger.info("New user registered", {
      userId: user.user_id,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        user,
        ...tokens,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Username or email is already in use.",
      });
    }

    next(error);
  }
};

// login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    await User.updateLastLogin(user.user_id);

    const tokens = await createTokenPair(user);

    const safeUser = await User.findById(user.user_id);

    logger.info("User logged in", {
      userId: user.user_id,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: safeUser,
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// refresh access token
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }

    if (decoded.tokenType !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const tokenHash = hashToken(refreshToken);

    const tokenResult = await query(
      `SELECT token_id, user_id
       FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash],
    );

    if (!tokenResult.rows.length) {
      return res.status(401).json({
        success: false,
        message: "Refresh token has been revoked or expired.",
      });
    }

    const storedToken = tokenResult.rows[0];

    if (storedToken.user_id !== decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const user = await User.findById(storedToken.user_id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "User account is unavailable.",
      });
    }

    // Revoke the old token before issuing a replacement.
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_id = $1`,
      [storedToken.token_id],
    );

    const tokens = await createTokenPair(user);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

// logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    await query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = $1
         AND user_id = $2
         AND revoked_at IS NULL`,
      [hashToken(refreshToken), req.user.userId],
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// current user
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
