import { NextResponse } from 'next/server'
import pg from 'pg'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== 'qwas13579') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUrl = "postgresql://postgres:qwas13579qwas@db.nmrhxvtcvcbcnaeonvsd.supabase.co:5432/postgres?sslmode=require"
    
    const client = new pg.Client({
        connectionString: dbUrl,
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
        
        return NextResponse.json({ success: true, message: 'Check constraint successfully updated!' })
    } catch (err: any) {
        await client.end().catch(() => {})
        return NextResponse.json({ error: err.message || err }, { status: 500 })
    }
}
