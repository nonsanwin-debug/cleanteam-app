'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, User, Calendar, Clock, X, Users, GripHorizontal } from 'lucide-react'
import { addSiteMember, removeSiteMember } from '@/actions/sites'
import { toast } from 'sonner'
import Link from 'next/link'

type Worker = {
    id: string
    name: string
    display_color?: string | null
    worker_type?: 'leader' | 'member'
}

type SiteMember = {
    site_id: string
    user_id: string
    user: { name: string; display_color?: string | null } | null
}

type Site = {
    id: string
    name: string
    address: string
    status: string
    worker_id: string | null
    cleaning_date?: string
    start_time?: string
    worker?: { name: string | null; display_color?: string | null } | null
}

interface Props {
    sites: Site[]
    workers: Worker[]
    siteMembers: SiteMember[]
    siteActions: React.ReactNode[]
}

export function SiteMemberAssignment({ sites, workers, siteMembers, siteActions }: Props) {
    const [isPending, startTransition] = useTransition()
    const [selectedMember, setSelectedMember] = useState<string | null>(null)
    const [draggedMember, setDraggedMember] = useState<string | null>(null)
    const [dragOverSiteId, setDragOverSiteId] = useState<string | null>(null)

    // 팀원 필터 (leader가 아닌 모든 워커)
    const members = workers.filter(w => w.worker_type !== 'leader')

    // 현장별 배정 팀원 맵
    const siteMembersMap = new Map<string, SiteMember[]>()
    for (const sm of siteMembers) {
        const list = siteMembersMap.get(sm.site_id) || []
        list.push(sm)
        siteMembersMap.set(sm.site_id, list)
    }

    function handleAssign(siteId: string, userId: string) {
        startTransition(async () => {
            const result = await addSiteMember(siteId, userId)
            if (result.success) {
                toast.success('팀원이 배정되었습니다')
            } else {
                toast.error(result.error || '배정 실패')
            }
            setSelectedMember(null)
        })
    }

    function handleRemove(siteId: string, userId: string) {
        startTransition(async () => {
            const result = await removeSiteMember(siteId, userId)
            if (result.success) {
                toast.success('팀원이 제거되었습니다')
            } else {
                toast.error(result.error || '제거 실패')
            }
        })
    }

    // 드래그 핸들러 (PC)
    function onDragStart(e: React.DragEvent, workerId: string) {
        setDraggedMember(workerId)
        e.dataTransfer.setData('text/plain', workerId)
        e.dataTransfer.effectAllowed = 'copy'
    }

    function onDragOver(e: React.DragEvent) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
    }

    function onDrop(e: React.DragEvent, siteId: string) {
        e.preventDefault()
        const workerId = e.dataTransfer.getData('text/plain')
        if (workerId) {
            handleAssign(siteId, workerId)
        }
        setDraggedMember(null)
        setDragOverSiteId(null)
    }

    function onDragEnd() {
        setDraggedMember(null)
        setDragOverSiteId(null)
    }

    // 터치(모바일): 팀원 선택 후 현장 탭
    function handleMemberTap(workerId: string) {
        if (selectedMember === workerId) {
            setSelectedMember(null)
        } else {
            setSelectedMember(workerId)
        }
    }

    function handleSiteTap(siteId: string) {
        if (selectedMember) {
            handleAssign(siteId, selectedMember)
        }
    }

    const selectedWorker = members.find(m => m.id === selectedMember)

    return (
        <div className="space-y-4">
            {/* 팀원 칩 목록 */}
            {members.length > 0 && (
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">팀원 배정</span>
                        {selectedMember && (
                            <span className="text-xs text-blue-600 ml-2 animate-pulse">
                                → 배정할 현장을 선택하세요
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {members.map(member => (
                            <div
                                key={member.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, member.id)}
                                onDragEnd={onDragEnd}
                                onClick={() => handleMemberTap(member.id)}
                                className={`
                                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                                    cursor-grab active:cursor-grabbing select-none transition-all duration-150
                                    ${selectedMember === member.id
                                        ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-105'
                                        : 'hover:shadow-md hover:scale-[1.02]'
                                    }
                                    ${draggedMember === member.id ? 'opacity-50' : ''}
                                `}
                                style={{
                                    backgroundColor: member.display_color
                                        ? `${member.display_color}20`
                                        : '#f1f5f9',
                                    color: member.display_color || '#475569',
                                    borderWidth: '1.5px',
                                    borderColor: member.display_color || '#cbd5e1',
                                }}
                            >
                                <GripHorizontal className="h-3 w-3 opacity-40" />
                                {member.name}
                            </div>
                        ))}
                    </div>
                    {selectedMember && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs text-slate-400"
                            onClick={() => setSelectedMember(null)}
                        >
                            선택 취소
                        </Button>
                    )}
                </div>
            )}

            {/* 현장 카드 그리드 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sites.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                        등록된 현장이 없습니다.
                    </div>
                ) : (
                    sites.map((site, idx) => {
                        const assigned = siteMembersMap.get(site.id) || []
                        const isHovered = dragOverSiteId === site.id
                        const isSelecting = selectedMember !== null

                        return (
                            <Card
                                key={site.id}
                                onDragOver={onDragOver}
                                onDragEnter={() => setDragOverSiteId(site.id)}
                                onDragLeave={(e) => {
                                    // 자식 요소로의 이동은 무시
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDragOverSiteId(null)
                                    }
                                }}
                                onDrop={(e) => onDrop(e, site.id)}
                                onClick={() => handleSiteTap(site.id)}
                                className={`
                                    overflow-hidden group transition-all duration-150
                                    ${isHovered
                                        ? 'border-blue-500 border-2 bg-blue-50/50 shadow-lg scale-[1.02]'
                                        : isSelecting
                                            ? 'hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
                                            : 'hover:border-slate-400'
                                    }
                                `}
                            >
                                <CardHeader className="pb-3 bg-slate-50/50 relative">
                                    <Link href={`/admin/sites/${site.id}`} className="absolute inset-0 z-0" />
                                    <div className="flex justify-between items-start z-10 pointer-events-none">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                                                {site.name}
                                            </CardTitle>
                                            <CardDescription className="flex items-center text-xs gap-2">
                                                <span className="flex items-center">
                                                    <Calendar className="mr-1 h-3 w-3" />
                                                    청소일: {site.cleaning_date || '-'}
                                                </span>
                                                {site.start_time && (
                                                    <span className="flex items-center text-blue-600 font-medium">
                                                        <Clock className="mr-0.5 h-3 w-3" />
                                                        {site.start_time}
                                                    </span>
                                                )}
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                site.status === 'completed'
                                                    ? 'bg-[#A3CCA3] text-white border-transparent hover:bg-[#92b892]'
                                                    : site.status === 'in_progress'
                                                        ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                                                        : 'text-foreground'
                                            }
                                        >
                                            {site.status === 'completed' ? '완료' :
                                                site.status === 'in_progress' ? '진행중' : '대기'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <Link href={`/admin/sites/${site.id}`} className="block space-y-3">
                                        <div className="flex items-start text-sm text-slate-600">
                                            <MapPin className="mr-2 h-4 w-4 text-slate-400 mt-0.5" />
                                            <span className="flex-1 line-clamp-1">{site.address}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600">
                                            <User className="mr-2 h-4 w-4 text-slate-400" />
                                            <span>
                                                {site.worker?.name ? (
                                                    <span className="font-medium" style={{ color: site.worker.display_color || undefined }}>{site.worker.name}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">담당자 미지정</span>
                                                )}
                                            </span>
                                        </div>
                                    </Link>

                                    {/* 배정된 팀원 */}
                                    {assigned.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {assigned.map(sm => (
                                                <span
                                                    key={sm.user_id}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                                                    style={{
                                                        backgroundColor: sm.user?.display_color
                                                            ? `${sm.user.display_color}20`
                                                            : '#f1f5f9',
                                                        color: sm.user?.display_color || '#64748b',
                                                    }}
                                                >
                                                    {sm.user?.name || '팀원'}
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleRemove(site.id, sm.user_id)
                                                        }}
                                                        className="ml-0.5 hover:text-red-500 transition-colors pointer-events-auto"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="pt-2 flex justify-end">
                                        {siteActions[idx]}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
