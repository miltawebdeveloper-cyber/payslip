const { Sequelize } = require('sequelize');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const requiresSsl =
  process.env.DB_SSL === 'true' ||
  (connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase')));

const dialectOptions = requiresSsl
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

let sequelize;

if (connectionString) {
  sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    dialectOptions,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'payslip_generator',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      dialectOptions,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

// Lazy sync for serverless cold-starts
let syncPromise = null;
function ensureDbSynced() {
  if (!syncPromise) {
    syncPromise = sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
  }
  return syncPromise;
}

module.exports = sequelize;
module.exports.ensureDbSynced = ensureDbSynced;
