const express = require("express");
const router = express.Router();

const { getPostSeo } = require("../controllers/seoController");

router.get("/posts/:slug", getPostSeo);

module.exports = router;
