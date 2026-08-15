import assert from 'node:assert/strict';
import { resolveDatabaseUrl } from '../lib/db-config.js';

assert.equal(
  resolveDatabaseUrl({
    DB_MODE: 'local',
    LOCAL_DATABASE_URL: 'postgresql://local/db',
    NEON_DATABASE_URL: 'postgresql://neon/db',
  }),
  'postgresql://local/db'
);

assert.equal(
  resolveDatabaseUrl({
    DB_MODE: 'neon',
    LOCAL_DATABASE_URL: 'postgresql://local/db',
    NEON_DATABASE_URL: 'postgresql://neon/db',
  }),
  'postgresql://neon/db'
);

assert.equal(
  resolveDatabaseUrl({
    DATABASE_URL: 'postgresql://manual/db',
  }),
  'postgresql://manual/db'
);

console.log('db-config tests passed');
