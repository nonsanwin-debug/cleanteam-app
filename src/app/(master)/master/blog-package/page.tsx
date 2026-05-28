import { getAllCompletedSitesForBlog } from "@/actions/master"
import { MasterBlogPackageClient } from "./blog-package-client"

export const dynamic = 'force-dynamic'

export default async function MasterBlogPackagePage() {
    const sites = await getAllCompletedSitesForBlog()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">AI 블로그 패키지</h1>
                <p className="text-slate-500 mt-1">NEXUS 플랫폼에서 완료된 모든 현장 목록을 조회하고, AI 블로그 홍보 전용 텍스트와 사진 압축 패키지(ZIP)를 다운로드합니다.</p>
            </div>

            <MasterBlogPackageClient initialSites={sites} />
        </div>
    )
}
