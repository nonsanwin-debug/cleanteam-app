import { headers } from 'next/headers'

export async function testHeaders() {
    const headersList = await headers()
    return {
        referer: headersList.get('referer'),
        invokePath: headersList.get('x-invoke-path')
    }
}
