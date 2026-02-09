import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
    const supabase = await createClient()
    const { data: sites } = await supabase.from('sites').select('id').limit(5)

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">Debug Sites</h1>
            <p className="mb-4 text-sm text-gray-500">Timestamp: {new Date().toISOString()}</p>
            <div className="space-y-2">
                {sites?.map((site) => (
                    <div key={site.id} className="p-2 border rounded">
                        <p>ID: {site.id}</p>
                        <p>
                            Link: <a href={`/share/${site.id}`} className="text-blue-500 underline">/share/{site.id}</a>
                        </p>
                    </div>
                ))}
            </div>
            {(!sites || sites.length === 0) && (
                <p className="text-red-500">No sites found.</p>
            )}
        </div>
    )
}
