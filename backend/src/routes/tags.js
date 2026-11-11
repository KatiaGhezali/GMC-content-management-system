const express = require("express");
const { body, param } = require("express-validator");

const tagController = require("../controllers/tagController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");

const router = express.Router();

router.get("/", tagController.getTags);

router.post(
  "/",
  authenticate,
  authorize("admin", "editor"),
  body("name").trim().notEmpty().isLength({ max: 100 }),
  validate,
  tagController.createTag,
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "editor"),
  param("id").isInt({ min: 1 }),
  body("name").trim().notEmpty().isLength({ max: 100 }),
  validate,
  tagController.updateTag,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "editor"),
  param("id").isInt({ min: 1 }),
  validate,
  tagController.deleteTag,
);

module.exports = router;
