'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MapPin, Calendar, User, Phone, CheckCircle2, Inbox, Loader2, FileDown, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { getCompletedSiteBlogData } from '@/actions/master'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface MasterBlogPackageClientProps {
    initialSites: any[]
}

export function MasterBlogPackageClient({ initialSites }: MasterBlogPackageClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const [sites, setSites] = useState(initialSites)

    const filteredSites = sites.filter(site => {
        const term = searchTerm.toLowerCase()
        return (
            site.name?.toLowerCase().includes(term) ||
            site.address?.toLowerCase().includes(term) ||
            site.customer_name?.toLowerCase().includes(term) ||
            site.worker_name?.toLowerCase().includes(term) ||
            site.company?.name?.toLowerCase().includes(term)
        )
    })

    const handleDownloadBlogPackage = async (siteId: string) => {
        setDownloadingId(siteId)
        toast.info('블로그 패키지 구성 중...', {
            description: '현장 정보 및 작업 사진을 서버에서 내려받고 있습니다.'
        })

        try {
            const result = await getCompletedSiteBlogData(siteId)
            
            if (!result.success) {
                throw new Error('데이터 로드 실패')
            }

            const { siteInfo, markdown, photos } = result
            
            // 1. Initialize JSZip
            const zip = new JSZip()

            // 2. Add blog guide markdown file
            zip.file('블로그_작성_가이드.md', markdown)

            // 3. Create folders for photos
            const beforeFolder = zip.folder('작업전_사진')
            const afterFolder = zip.folder('작업후_사진')

            // 4. Populate photos
            photos.forEach((p: any) => {
                const folder = p.phase === 'after' ? afterFolder : beforeFolder
                if (folder) {
                    // Convert Base64 back to binary data
                    folder.file(p.fileName, p.base64, { base64: true })
                }
            })

            // 5. Generate zip file and download
            const content = await zip.generateAsync({ type: 'blob' })
            
            // Format zip name: [Date]_[Region]_[CustomerName]_블로그_패키지.zip
            const rawDate = siteInfo.cleaning_date ? new Date(siteInfo.cleaning_date) : new Date()
            const dateStr = format(rawDate, 'yyyy-MM-dd')
            const regionStr = siteInfo.name.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
            const customerStr = siteInfo.customer_name.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
            const zipFileName = `${dateStr}_${regionStr}_${customerStr}_블로그_패키지.zip`

            saveAs(content, zipFileName)
            toast.success('다운로드 완료!', {
                description: '블로그 패키지 압축 파일이 정상적으로 다운로드되었습니다.'
            })
        } catch (error: any) {
            console.error('Download blog package error:', error)
            toast.error('다운로드 실패', {
                description: error.message || '패키지 빌드 중 오류가 발생했습니다.'
            })
        } finally {
            setDownloadingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="현장명, 주소, 고객명, 업체명 검색..."
                    className="pl-9 border-slate-200 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredSites.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center">
                        <Inbox className="h-10 w-10 mb-3 text-slate-300" />
                        <p>완료된 현장 내역이 없습니다.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSites.map(site => (
                        <Card key={site.id} className="overflow-hidden border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all">
                            <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1 w-[70%]">
                                        <Badge variant="outline" className="w-fit text-xs border-indigo-200 text-indigo-700 bg-indigo-50 font-bold">
                                            {site.company?.name || '소속 불명'}
                                        </Badge>
                                        <CardTitle className="text-lg mt-1 font-bold truncate" title={site.name}>{site.name}</CardTitle>
                                    </div>
                                    <div className="shrink-0 mt-2">
                                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">작업 완료</Badge>
                                    </div>
                                </div>
                                <CardDescription className="flex items-center gap-1.5 mt-2">
                                    <span className="text-xs text-slate-500 font-medium">
                                        완료일시: {site.completed_at ? format(new Date(site.completed_at), 'yyyy-MM-dd HH:mm') : '알 수 없음'}
                                    </span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="col-span-2 flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <span className="text-slate-700 font-medium">{site.address || '주소 미등록'} {site.detail_address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-slate-700">{site.cleaning_date || '날짜 미정'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-slate-700 truncate">{site.customer_name || '고객명 미상'}</span>
                                    </div>
                                    {site.residential_type && (
                                        <div className="col-span-2 text-xs bg-slate-100/70 p-2 rounded-md text-slate-600 flex flex-wrap gap-x-2">
                                            <span>🏠 {site.residential_type}</span>
                                            {site.area_size && <span>• {site.area_size}평</span>}
                                            {site.structure_type && <span>• {site.structure_type}</span>}
                                        </div>
                                    )}
                                    <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-50">
                                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="text-slate-700 text-xs font-semibold">
                                            책임 팀장: {site.worker_name || '미배정'} {site.worker_phone ? `(${site.worker_phone})` : ''}
                                        </span>
                                    </div>
                                </div>

                                {site.special_notes && (
                                    <div className="mt-2 bg-amber-50/50 p-2.5 rounded text-xs text-amber-800 whitespace-pre-wrap border border-amber-100 max-h-[100px] overflow-y-auto">
                                        💡 <strong>요청사항:</strong> {site.special_notes}
                                    </div>
                                )}

                                {/* AI 블로그 패키지 다운로드 버튼 */}
                                <div className="mt-3 pt-3 border-t border-indigo-100">
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 text-xs font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/50 hover:border-indigo-300"
                                        onClick={() => handleDownloadBlogPackage(site.id)}
                                        disabled={downloadingId === site.id}
                                    >
                                        {downloadingId === site.id ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                블로그 패키지 구성 중...
                                            </>
                                        ) : (
                                            <>
                                                <FileDown className="w-4 h-4 mr-1.5" />
                                                AI 블로그 패키지 다운로드 (ZIP)
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
