const { Pool } = require('pg');
const logger = require('../utils/logger');

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'xinote_db',
  user: process.env.DB_USER || 'xinote_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

// Connection test function
const connect = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('PostgreSQL connected at:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    logger.error('PostgreSQL connection error:', error);
    throw error;
  }
};

// Query function with error handling and logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query: text.substring(0, 100),
        duration,
        rows: result.rowCount
      });
    }

    return result;
  } catch (error) {
    logger.error('Query error:', {
      query: text.substring(0, 100),
      error: error.message
    });
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Close pool gracefully
const end = async () => {
  await pool.end();
  logger.info('PostgreSQL pool closed');
};

module.exports = {
  pool,
  query,
  connect,
  transaction,
  end,
};
