import dns from 'dns'

const HOSTS = [
  'nmrhxvtcvcbcnaeonvsd.supabase.co',
  'db.nmrhxvtcvcbcnaeonvsd.supabase.co',
  'aws-0-ap-northeast-2.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-ap-northeast-1.pooler.supabase.com',
]

for (const host of HOSTS) {
  dns.resolve(host, (err, addresses) => {
    if (err) {
      console.log(`Failed to resolve ${host}:`, err.message)
    } else {
      console.log(`Resolved ${host} to:`, addresses)
    }
  })
}
