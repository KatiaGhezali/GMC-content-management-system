const express = require("express");
const { body, param } = require("express-validator");

const commentController = require("../controllers/commentController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");

const router = express.Router();

const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
};

// Publicly visible approved comments.
router.get(
  "/post/:postId",
  param("postId").isInt({ min: 1 }),
  validate,
  commentController.getPostComments,
);

// Anyone can submit a comment; authentication is optional.
router.post(
  "/",
  optionalAuth,
  body("postId").isInt({ min: 1 }),
  body("content").trim().notEmpty().isLength({ max: 5000 }),
  body("parentCommentId").optional({ nullable: true }).isInt({ min: 1 }),
  validate,
  commentController.createComment,
);

// Moderation routes.
router.get(
  "/moderation",
  authenticate,
  authorize("admin", "editor"),
  commentController.getCommentsForModeration,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "editor"),
  param("id").isInt({ min: 1 }),
  body("status").isIn(["pending", "approved", "spam", "trash"]),
  validate,
  commentController.updateCommentStatus,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "editor"),
  param("id").isInt({ min: 1 }),
  validate,
  commentController.deleteComment,
);

module.exports = router;
