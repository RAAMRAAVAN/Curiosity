#!/usr/bin/env node
const { Client } = require('pg');

const connectionString = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
console.log('Testing connection with URL:', connectionString?.substring(0, 50) + '...');

const client = new Client({
  connectionString: connectionString
});

client.connect()
  .then(() => {
    console.log('✅ Database connection successful!');
    return client.query('SELECT NOW() as current_time, version()');
  })
  .then((result) => {
    console.log('✅ Query successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].version);
  })
  .catch((error) => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });
