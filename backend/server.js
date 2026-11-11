require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});

const app = require("./src/app");
const { testConnection, pool } = require("./src/config/database");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const databaseConnected = await testConnection();

  if (!databaseConnected) {
    console.error("Cannot start server without a database connection.");
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`EduCMS API running on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down server...");

    server.close(async () => {
      await pool.end();
      console.log("Database connection pool closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

if (require.main === module) {
  startServer();
}

module.exports = app;
