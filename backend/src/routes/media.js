const express = require("express");
const { body, param } = require("express-validator");

const mediaController = require("../controllers/mediaController");
const upload = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validation");

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin", "editor", "author"));

router.post(
  "/",
  upload.single("file"),
  body("altText").optional().isString().isLength({ max: 500 }),
  body("caption").optional().isString().isLength({ max: 1000 }),
  validate,
  mediaController.uploadMedia,
);

router.get("/", mediaController.getMedia);

router.get(
  "/:id",
  param("id").isInt({ min: 1 }),
  validate,
  mediaController.getMediaById,
);

router.patch(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("altText").optional().isString().isLength({ max: 500 }),
  body("caption").optional().isString().isLength({ max: 1000 }),
  validate,
  mediaController.updateMedia,
);

router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  validate,
  mediaController.deleteMedia,
);

module.exports = router;
