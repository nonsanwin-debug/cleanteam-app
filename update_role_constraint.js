const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function test() {
  await client.connect();
  try {
    await client.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;");
    await client.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('worker', 'admin', 'master', 'partner', 'banned'));");
    console.log('Successfully updated users_role_check constraint');
  } catch (err) {
    console.error('Error:', err);
  }
  await client.end();
}
test();
