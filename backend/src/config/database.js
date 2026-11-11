const { Pool } = require("pg");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

// Database configuration
const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "educms_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
};

// Create connection pool
const pool = new Pool(config);

// Handle pool events
pool.on("connect", () => {
  console.log("New database connection established");
});

pool.on("acquire", () => {
  console.log("Database connection acquired from pool");
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
  process.exit(-1);
});

pool.on("remove", () => {
  console.log("Database connection removed from pool");
});

// Test database connection
const testConnection = async () => {
  let client;

  try {
    client = await pool.connect();

    const result = await client.query("SELECT NOW()");

    console.log("Database connected successfully at:", result.rows[0].now);

    return true;
  } catch (error) {
    console.error("Database connection failed:", error.message);

    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
};
// Query helper
const query = async (text, params) => {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);

    const duration = Date.now() - start;

    console.log(`Executed query in ${duration}ms`);

    return result;
  } catch (error) {
    console.error("Query error:", error);

    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  pool,
  transaction,
  testConnection,
};
