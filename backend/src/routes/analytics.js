const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");

const {
  getDashboardAnalytics,
  getDailyViews,
  getTopPosts,
  getPostAnalytics,
  getAuthorAnalytics,
} = require("../controllers/analyticsController");

router.use(authenticate);
router.use(authorize("admin", "editor", "author"));

router.get("/dashboard", getDashboardAnalytics);
router.get("/views", getDailyViews);
router.get("/posts/top", getTopPosts);
router.get("/posts/:postId", getPostAnalytics);
router.get("/authors/:authorId", getAuthorAnalytics);

module.exports = router;
