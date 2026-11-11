const express = require("express");
const { body, param } = require("express-validator");

const categoryController = require("../controllers/categoryController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");

const router = express.Router();

router.get("/", categoryController.getCategories);

router.post(
  "/",
  authenticate,
  authorize("admin", "editor"),
  body("name").trim().notEmpty().isLength({ max: 100 }),
  body("description").optional().isString(),
  body("parentId").optional({ nullable: true }).isInt({ min: 1 }),
  validate,
  categoryController.createCategory,
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "editor"),
  param("id").isInt({ min: 1 }),
  body("name").optional().trim().notEmpty().isLength({ max: 100 }),
  body("description").optional().isString(),
  body("parentId").optional({ nullable: true }).isInt({ min: 1 }),
  body("isActive").optional().isBoolean(),
  validate,
  categoryController.updateCategory,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "editor"),
  param("id").isInt({ min: 1 }),
  validate,
  categoryController.deleteCategory,
);

module.exports = router;
