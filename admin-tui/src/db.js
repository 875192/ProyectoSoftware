'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://unigear_app:unigear_password@localhost:5433/unigear'
});

module.exports = pool;
