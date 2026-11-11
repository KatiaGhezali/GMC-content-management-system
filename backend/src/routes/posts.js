const express = require("express");
const { body, param, query: queryValidator } = require("express-validator");

const postController = require("../controllers/postController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) return next();

  return authenticate(req, res, next);
};

const postValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ max: 255 })
    .withMessage("Title cannot exceed 255 characters."),
  body("content").trim().notEmpty().withMessage("Content is required."),
  body("excerpt").optional().isString().withMessage("Excerpt must be text."),
  body("categoryId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer."),
  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid post status."),
  body("tagIds").optional().isArray().withMessage("tagIds must be an array."),
  body("tagIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each tag ID must be a positive integer."),
];

const updatePostValidation = [
  body("title").optional().trim().notEmpty().isLength({ max: 255 }),
  body("content").optional().trim().notEmpty(),
  body("excerpt").optional().isString(),
  body("categoryId").optional({ nullable: true }).isInt({ min: 1 }),
  body("status").optional().isIn(["draft", "published", "archived"]),
  body("tagIds").optional().isArray(),
  body("tagIds.*").optional().isInt({ min: 1 }),
];
router.get("/", optionalAuth, postController.getPosts);
router.get(
  "/:id",
  optionalAuth,
  param("id").isInt({ min: 1 }),
  validate,
  postController.getPost,
);

router.post(
  "/",
  authenticate,
  authorize("admin", "editor", "author"),
  postValidation,
  validate,
  postController.createPost,
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "editor", "author"),
  param("id").isInt({ min: 1 }),
  ...updatePostValidation,
  validate,
  postController.updatePost,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "editor", "author"),
  param("id").isInt({ min: 1 }),
  validate,
  postController.deletePost,
);

module.exports = router;
