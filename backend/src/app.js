require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");

const { testConnection } = require("./config/database");
const logger = require("./utils/logger");

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

// Request logging
app.use(morgan("dev"));

app.use(compression());

// Body parsing
app.use(express.json());
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const categoryRoutes = require("./routes/categories");
const tagRoutes = require("./routes/tags");
const commentRoutes = require("./routes/comments");
const path = require("path");
const mediaRoutes = require("./routes/media");
const seoRoutes = require("./routes/seo");
const analyticsRoutes = require("./routes/analytics");

const revisionRoutes = require("./routes/revisions");

const apiVersion = process.env.API_VERSION || "v1";

app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/posts`, postRoutes);
app.use(`/api/${apiVersion}/categories`, categoryRoutes);
app.use(`/api/${apiVersion}/tags`, tagRoutes);
app.use(`/api/${apiVersion}/comments`, commentRoutes);
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use(`/api/${apiVersion}/media`, mediaRoutes);
app.use(`/api/${apiVersion}/seo`, seoRoutes);
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);

app.use(`/api/${apiVersion}/posts`, revisionRoutes);

app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(express.urlencoded({ extended: true }));

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to EduCMS API",
    version: process.env.API_VERSION || "v1",
  });
});

// Health check
app.get("/api/health", async (req, res, next) => {
  try {
    const databaseConnected = await testConnection();

    res.status(databaseConnected ? 200 : 503).json({
      success: databaseConnected,
      message: databaseConnected
        ? "EduCMS API is running"
        : "Database connection unavailable",
    });
  } catch (error) {
    next(error);
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

module.exports = app;
