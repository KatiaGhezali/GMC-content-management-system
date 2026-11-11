const express = require("express");
const { param } = require("express-validator");

const revisionController = require("../controllers/revisionController");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin", "editor", "author"));

router.get(
  "/:postId/revisions",
  param("postId").isInt({ min: 1 }),
  validate,
  revisionController.getRevisions,
);

router.get(
  "/:postId/revisions/:revisionId",
  param("postId").isInt({ min: 1 }),
  param("revisionId").isInt({ min: 1 }),
  validate,
  revisionController.getRevision,
);

router.post(
  "/:postId/revisions/:revisionId/restore",
  param("postId").isInt({ min: 1 }),
  param("revisionId").isInt({ min: 1 }),
  validate,
  revisionController.restoreRevision,
);

module.exports = router;
