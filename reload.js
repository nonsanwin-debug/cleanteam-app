const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function test() {
  await client.connect();
  await client.query("NOTIFY pgrst, 'reload schema'");
  console.log('Reloaded schema cache');
  await client.end();
}
test().catch(console.error);
