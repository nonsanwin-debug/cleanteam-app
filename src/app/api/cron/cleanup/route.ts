import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * 완료된 작업 자동 삭제 Cron Job
 * 매일 자정 (KST 기준) 실행
 * completed_at이 7일 이상 된 completed 상태의 현장을 삭제
 */
export async function GET(request: Request) {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const adminSupabase = createAdminClient()

        // 7일 전 날짜 계산
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const cutoffDate = sevenDaysAgo.toISOString()

        // 1. 삭제 대상 현장 조회 (관련 사진 Storage 정리를 위해)
        const { data: sitesToDelete, error: fetchError } = await adminSupabase
            .from('sites')
            .select('id')
            .eq('status', 'completed')
            .lt('completed_at', cutoffDate)

        if (fetchError) {
            console.error('Cron: 삭제 대상 조회 오류:', fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!sitesToDelete || sitesToDelete.length === 0) {
            return NextResponse.json({ message: '삭제할 작업이 없습니다.', deleted: 0 })
        }

        const siteIds = sitesToDelete.map(s => s.id)

        // 2. 관련 사진 레코드 조회
        const { data: photos } = await adminSupabase
            .from('photos')
            .select('url')
            .in('site_id', siteIds)

        // 3. Storage에서 사진 파일 삭제
        if (photos && photos.length > 0) {
            const filePaths = photos
                .map(p => {
                    const parts = p.url?.split('/site-photos/')
                    return parts && parts.length === 2 ? parts[1] : null
                })
                .filter(Boolean) as string[]

            if (filePaths.length > 0) {
                // Supabase Storage는 한 번에 최대 1000개 삭제 가능
                for (let i = 0; i < filePaths.length; i += 100) {
                    const batch = filePaths.slice(i, i + 100)
                    await adminSupabase.storage.from('site-photos').remove(batch)
                }
            }
        }

        // 4. 관련 데이터 삭제 (photos, site_members, worker_hidden_sites → CASCADE로 처리될 수 있지만 명시적으로)
        await adminSupabase.from('photos').delete().in('site_id', siteIds)
        await adminSupabase.from('site_members').delete().in('site_id', siteIds)
        await adminSupabase.from('worker_hidden_sites').delete().in('site_id', siteIds)

        // 5. 현장 삭제
        const { error: deleteError } = await adminSupabase
            .from('sites')
            .delete()
            .in('id', siteIds)

        if (deleteError) {
            console.error('Cron: 현장 삭제 오류:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        console.log(`Cron: ${siteIds.length}개 완료 작업 삭제 완료`)
        return NextResponse.json({
            message: `${siteIds.length}개 완료 작업이 삭제되었습니다.`,
            deleted: siteIds.length,
            photosDeleted: photos?.length || 0
        })
    } catch (error) {
        console.error('Cron: 자동 삭제 오류:', error)
        return NextResponse.json({ error: '자동 삭제 중 오류 발생' }, { status: 500 })
    }
}
