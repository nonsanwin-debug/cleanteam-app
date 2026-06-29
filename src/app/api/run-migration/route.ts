import { NextResponse } from 'next/server'
import pg from 'pg'

export const dynamic = 'force-dynamic'

// Disable SSL certificate validation globally for this request
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const REGIONS = [
    "aws-0-us-east-1",
    "aws-0-us-east-2",
    "aws-0-us-west-1",
    "aws-0-us-west-2",
    "aws-0-ap-northeast-2", // Seoul
    "aws-0-ap-northeast-1", // Tokyo
    "aws-0-ap-southeast-1", // Singapore
    "aws-0-ap-southeast-2", // Sydney
    "aws-0-ap-south-1",     // Mumbai
    "aws-0-eu-central-1",   // Frankfurt
    "aws-0-eu-west-1",      // Ireland
    "aws-0-eu-west-2",      // London
    "aws-0-eu-west-3",      // Paris
    "aws-0-eu-north-1",
    "aws-0-sa-east-1",
    "aws-0-ca-central-1"
]

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== 'qwas13579') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: Record<string, string> = {}
    let successRegion = null

    for (const region of REGIONS) {
        const host = `${region}.pooler.supabase.com`
        const dbUrl = `postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@${host}:6543/postgres?sslmode=require`
        
        const client = new pg.Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 2000
        })

        try {
            await client.connect()
            
            const sql = `
                ALTER TABLE public.shared_orders DROP CONSTRAINT IF EXISTS shared_orders_status_check;
                ALTER TABLE public.shared_orders ADD CONSTRAINT shared_orders_status_check CHECK (
                    status IN ('open', 'accepted', 'transferred', 'cancelled', 'deleted_by_receiver', 'reclaim_requested', 'completed', 'deleted')
                );
            `
            await client.query(sql)
            await client.end()
            
            results[region] = "SUCCESS: Constraint updated!"
            successRegion = region
            break // Done!
        } catch (err: any) {
            await client.end().catch(() => {})
            results[region] = err.message || JSON.stringify(err)
        }
    }

    return NextResponse.json({
        success: successRegion !== null,
        successRegion,
        results
    })
}
