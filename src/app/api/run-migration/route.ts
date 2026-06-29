import { NextResponse } from 'next/server'
import pg from 'pg'
import dns from 'dns'

export const dynamic = 'force-dynamic'

async function probeDns(host: string): Promise<any> {
    return new Promise((resolve) => {
        dns.resolve(host, (err, addresses) => {
            resolve({ host, addresses: addresses || null, error: err ? err.message : null })
        })
    })
}

async function tryConnect(dbUrl: string): Promise<any> {
    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
    })
    try {
        await client.connect()
        await client.end()
        return { success: true }
    } catch (err: any) {
        await client.end().catch(() => {})
        return { success: false, error: err.message || err }
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== 'qwas13579') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dnsResults = {
        direct: await probeDns("db.nmrhxvtcvcbcnaeonvsd.supabase.co"),
        seoul_pooler: await probeDns("aws-0-ap-northeast-2.pooler.supabase.com"),
        us_west_pooler: await probeDns("aws-0-us-west-1.pooler.supabase.com")
    }

    const urls = {
        direct: "postgresql://postgres:qwas13579qwas@db.nmrhxvtcvcbcnaeonvsd.supabase.co:5432/postgres?sslmode=require",
        seoul_pooler: "postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require",
        us_west_pooler: "postgresql://postgres.nmrhxvtcvcbcnaeonvsd:qwas13579qwas@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
    }

    const connResults = {
        direct: await tryConnect(urls.direct),
        seoul_pooler: await tryConnect(urls.seoul_pooler),
        us_west_pooler: await tryConnect(urls.us_west_pooler)
    }

    // Let's also try to execute the query if any connection is successful
    let runResult = "No connection succeeded"
    let successUrl = null
    for (const [key, result] of Object.entries(connResults)) {
        if (result.success) {
            successUrl = urls[key as keyof typeof urls]
            break
        }
    }

    if (successUrl) {
        const client = new pg.Client({
            connectionString: successUrl,
            ssl: { rejectUnauthorized: false }
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
            runResult = "SQL query executed successfully on " + successUrl
        } catch (err: any) {
            await client.end().catch(() => {})
            runResult = "SQL execution failed: " + (err.message || err)
        }
    }

    return NextResponse.json({
        dnsResults,
        connResults,
        runResult
    })
}
