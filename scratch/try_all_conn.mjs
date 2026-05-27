import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PROJECT_REF = "nmrhxvtcvcbcnaeonvsd";
const PASS = "qwas13579qwas";

const PARAMETERS = [
  // Host, Port, User
  { host: "aws-0-ap-northeast-2.pooler.supabase.com", port: 6543, user: `postgres.${PROJECT_REF}` },
  { host: "aws-0-ap-northeast-2.pooler.supabase.com", port: 5432, user: `postgres.${PROJECT_REF}` },
  { host: "aws-0-ap-northeast-2.pooler.supabase.com", port: 6543, user: `postgres` },
  { host: "aws-0-ap-northeast-2.pooler.supabase.com", port: 5432, user: `postgres` },
  
  { host: "aws-0-us-west-1.pooler.supabase.com", port: 6543, user: `postgres.${PROJECT_REF}` },
  { host: "aws-0-us-west-1.pooler.supabase.com", port: 5432, user: `postgres.${PROJECT_REF}` },
  
  { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, user: `postgres.${PROJECT_REF}` },
  { host: "aws-0-us-east-1.pooler.supabase.com", port: 5432, user: `postgres.${PROJECT_REF}` },

  { host: `${PROJECT_REF}.supabase.co`, port: 6543, user: `postgres.${PROJECT_REF}` },
  { host: `${PROJECT_REF}.supabase.co`, port: 5432, user: `postgres` },
  { host: `${PROJECT_REF}.supabase.co`, port: 5432, user: `postgres.${PROJECT_REF}` },
]

async function testAll() {
  for (const param of PARAMETERS) {
    console.log(`Connecting to ${param.host}:${param.port} as ${param.user}...`)
    const client = new pg.Client({
      host: param.host,
      port: param.port,
      user: param.user,
      password: PASS,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    })

    try {
      await client.connect()
      console.log(`🎉 SUCCESS!!! Connected to ${param.host}:${param.port} as ${param.user}`)
      const res = await client.query('SELECT current_database();')
      console.log("Database:", res.rows[0])
      await client.end()
      return
    } catch (err) {
      console.log(`  -> Failed: ${err.message}`)
      await client.end().catch(() => {})
    }
  }
  console.log("❌ All connection permutations failed.")
}

testAll()
