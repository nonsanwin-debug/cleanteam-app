import dns from 'dns'
import pg from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const PROJECT_REF = "nmrhxvtcvcbcnaeonvsd";
const PASS = "qwas13579qwas";
const HOST = `db.${PROJECT_REF}.supabase.co`

async function run() {
  console.log(`Resolving AAAA (IPv6) for ${HOST}...`)
  dns.resolve6(HOST, async (err, addresses) => {
    if (err) {
      console.error("AAAA resolution failed:", err.message)
      return
    }
    console.log("IPv6 Addresses resolved:", addresses)

    // Let's try to connect to the first IPv6 address
    const ipv6 = addresses[0]
    console.log(`Connecting to [${ipv6}]:5432...`)

    const client = new pg.Client({
      host: ipv6,
      port: 5432,
      user: "postgres",
      password: PASS,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    })

    try {
      await client.connect()
      console.log("🎉 SUCCESS!!! Connected to IPv6 directly!")
      const res = await client.query('SELECT current_database();')
      console.log("Database:", res.rows[0])
      await client.end()
    } catch (connErr) {
      console.error("Connection failed:", connErr.message)
      await client.end().catch(() => {})
    }
  })
}

run()
