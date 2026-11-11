const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validation");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs:
    (Number.parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15) * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

const registrationValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username can only contain letters, numbers, and underscores.",
    ),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be between 8 and 72 characters."),

  body("firstName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("First name cannot exceed 100 characters."),

  body("lastName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Last name cannot exceed 100 characters."),
];

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password").isString().notEmpty().withMessage("Password is required."),
];

// Register
router.post(
  "/register",
  authLimiter,
  registrationValidation,
  validate,
  authController.register,
);

// Login
router.post(
  "/login",
  authLimiter,
  loginValidation,
  validate,
  authController.login,
);

// Refresh access token
router.post(
  "/refresh",
  authLimiter,
  [
    body("refreshToken")
      .isString()
      .notEmpty()
      .withMessage("Refresh token is required."),
  ],
  validate,
  authController.refresh,
);

// Logout
router.post(
  "/logout",
  authenticate,
  [
    body("refreshToken")
      .isString()
      .notEmpty()
      .withMessage("Refresh token is required."),
  ],
  validate,
  authController.logout,
);

// Current authenticated user
router.get("/me", authenticate, authController.me);

module.exports = router;
