'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Send, UserPlus, Copy, Check, MessageCircle, ChevronDown, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ChatMessage {
    id: string
    site_id: string
    sender_name: string
    sender_phone?: string
    sender_role: string
    sender_user_id?: string
    message: string
    created_at: string
}

interface SiteChatProps {
    siteId: string
    currentUserName?: string
    currentUserRole?: 'leader' | 'customer' | 'guest' | 'admin'
    currentUserId?: string
    customerPhone?: string
}

const ROLE_LABELS: Record<string, string> = {
    leader: '작업팀',
    customer: '고객',
    admin: '관리자',
    guest: '게스트',
}

const ROLE_COLORS: Record<string, string> = {
    leader: 'bg-blue-100 text-blue-700',
    customer: 'bg-emerald-100 text-emerald-700',
    admin: 'bg-purple-100 text-purple-700',
    guest: 'bg-slate-100 text-slate-600',
}

function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}


export function SiteChat({ siteId, currentUserName, currentUserRole = 'guest', currentUserId, customerPhone }: SiteChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isOpen, setIsOpen] = useState(true)
    const [copied, setCopied] = useState(false)
    
    // 닉네임 입력 (고객/게스트용)
    const [nickname, setNickname] = useState(currentUserName || '')
    const [hasSetNickname, setHasSetNickname] = useState(!!currentUserName)
    
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    
    const [unreadCount, setUnreadCount] = useState(0)
    const [onlineUsers, setOnlineUsers] = useState<Array<{ name: string; role: string; online_at: string }>>([])

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 외부에서 전달된 사용자 이름 비동기 연동
    useEffect(() => {
        if (currentUserName) {
            setNickname(currentUserName)
            setHasSetNickname(true)
        }
    }, [currentUserName])

    // Presence: 실시간 접속자 추적
    useEffect(() => {
        if (!isOpen || !hasSetNickname || !nickname.trim()) {
            setOnlineUsers([])
            return
        }

        const channel = supabase.channel(`presence_${siteId}`, {
            config: {
                presence: {
                    key: `${nickname.trim()}_${currentUserRole}_${currentUserId || 'anon'}_${Math.random().toString(36).substring(2, 6)}`,
                },
            },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const users: any[] = []
                Object.keys(state).forEach((key) => {
                    const presences = state[key] as any[]
                    presences.forEach((p) => {
                        if (p.name) {
                            users.push({
                                name: p.name,
                                role: p.role || 'guest',
                                online_at: p.online_at,
                            })
                        }
                    })
                })
                // 이름과 역할 기준으로 중복 제거
                const uniqueUsers = users.filter((u, index, self) => 
                    index === self.findIndex((t) => t.name === u.name && t.role === u.role)
                )
                setOnlineUsers(uniqueUsers)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        name: nickname.trim(),
                        role: currentUserRole,
                        online_at: new Date().toISOString(),
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [siteId, isOpen, hasSetNickname, nickname, currentUserRole, currentUserId])

    // 메시지 로드
    useEffect(() => {
        if (!isOpen) return
        
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('site_chat_messages')
                .select('*')
                .eq('site_id', siteId)
                .order('created_at', { ascending: true })
                .limit(200)

            if (!error && data) {
                setMessages(data)
                setUnreadCount(0)
            }
        }

        fetchMessages()

        // Realtime 구독
        const channel = supabase
            .channel(`chat_${siteId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'site_chat_messages',
                    filter: `site_id=eq.${siteId}`
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage
                    setMessages(prev => [...prev, newMsg])
                    
                    if (!isOpen) {
                        setUnreadCount(prev => prev + 1)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [siteId, isOpen])

    // 비가시 상태에서 새 메시지 카운트 (채팅이 닫혀있을 때)
    useEffect(() => {
        if (!isOpen) {
            const channel = supabase
                .channel(`chat_notify_${siteId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'site_chat_messages',
                        filter: `site_id=eq.${siteId}`
                    },
                    () => {
                        setUnreadCount(prev => prev + 1)
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [siteId, isOpen])

    // 스크롤 맨 아래로
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            const container = messagesEndRef.current.parentElement
            if (container) {
                container.scrollTop = container.scrollHeight
            }
        }
    }, [messages, isOpen])

    // 메시지 전송
    const handleSend = async () => {
        if (!newMessage.trim() || !nickname.trim()) return
        
        setIsSending(true)
        try {
            const { error } = await supabase
                .from('site_chat_messages')
                .insert({
                    site_id: siteId,
                    sender_name: nickname.trim(),
                    sender_role: currentUserRole,
                    sender_user_id: currentUserId || null,
                    message: newMessage.trim(),
                })

            if (error) throw error
            setNewMessage('')
            inputRef.current?.focus()
        } catch (err: any) {
            console.error('Chat send error:', err)
            toast.error('메시지 전송 실패')
        } finally {
            setIsSending(false)
        }
    }

    // 초대 링크 복사
    const handleCopyInviteLink = () => {
        const url = `${window.location.origin}/share/${siteId}`
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true)
            toast.success('초대 링크가 복사되었습니다.')
            setTimeout(() => setCopied(false), 2000)
        }).catch(() => {
            // fallback
            const textArea = document.createElement('textarea')
            textArea.value = url
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
            setCopied(true)
            toast.success('초대 링크가 복사되었습니다.')
            setTimeout(() => setCopied(false), 2000)
        })
    }

    // SMS 초대
    const handleSmsInvite = () => {
        const url = `${window.location.origin}/share/${siteId}`
        const body = encodeURIComponent(`[NEXUS] 현장 채팅에 참여하세요!\n\n아래 링크를 눌러 현장 진행 상황을 확인하고 채팅에 참여할 수 있습니다.\n\n${url}`)
        window.location.href = `sms:?body=${body}`
    }

    // 닉네임 설정
    const handleSetNickname = () => {
        if (nickname.trim()) {
            setHasSetNickname(true)
        }
    }

    // 날짜 구분자 체크
    const getDateLabel = (msg: ChatMessage, index: number) => {
        if (index === 0) return formatDate(msg.created_at)
        const prevDate = new Date(messages[index - 1].created_at).toDateString()
        const currDate = new Date(msg.created_at).toDateString()
        if (prevDate !== currDate) return formatDate(msg.created_at)
        return null
    }

    // 내 메시지 체크
    const isMyMessage = (msg: ChatMessage) => {
        if (currentUserId && msg.sender_user_id === currentUserId) return true
        if (!currentUserId && msg.sender_name === nickname && msg.sender_role === currentUserRole) return true
        return false
    }

    return (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* 상단 바 */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex gap-2 items-center w-full justify-start overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    {currentUserRole === 'leader' && customerPhone && (
                        <a
                            href={`tel:${customerPhone.split('/')[0].trim().replace(/-/g, '')}`}
                            className="h-8 px-3 inline-flex items-center justify-center rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all shrink-0 whitespace-nowrap gap-1.5"
                        >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            전화 걸기
                        </a>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-medium text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:text-blue-600 shadow-sm shrink-0 whitespace-nowrap gap-1.5 [&_svg]:size-3.5"
                        onClick={handleCopyInviteLink}
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        링크 복사
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs font-medium text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:text-blue-600 shadow-sm shrink-0 whitespace-nowrap gap-1.5 [&_svg]:size-3.5"
                        onClick={handleSmsInvite}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        SMS 초대
                    </Button>
                </div>
            </div>

            {/* 닉네임 미설정 시 */}
            {!hasSetNickname ? (
                <div className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                        <MessageCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">채팅 참여</h4>
                        <p className="text-xs text-slate-500 mt-1">표시될 이름을 입력해주세요</p>
                    </div>
                    <div className="flex gap-2 max-w-[280px] mx-auto">
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="이름 입력"
                            className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSetNickname() }}
                            autoFocus
                        />
                        <Button
                            onClick={handleSetNickname}
                            disabled={!nickname.trim()}
                            className="h-10 px-4 bg-blue-600 hover:bg-blue-700"
                        >
                            참여
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {/* 온라인 참여자 목록 */}
                    {onlineUsers.length > 0 && (
                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0 w-full whitespace-nowrap">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 shrink-0 whitespace-nowrap">참여 중 ({onlineUsers.length}):</span>
                            <div className="flex gap-1 text-[10px] text-slate-600 shrink-0 whitespace-nowrap items-center">
                                {onlineUsers.map((user, idx) => (
                                    <span key={idx} className="bg-white px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1 shrink-0 whitespace-nowrap">
                                        <span className="font-bold text-[10px] whitespace-nowrap shrink-0">{user.name}</span>
                                        <span className={`text-[8px] px-1 py-0.5 rounded font-bold shrink-0 whitespace-nowrap ${ROLE_COLORS[user.role] || ROLE_COLORS.guest}`}>
                                            {ROLE_LABELS[user.role] || '참여자'}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 메시지 목록 */}
                    <div className="h-[300px] overflow-y-auto px-4 py-3 space-y-1 bg-slate-50/50">
                        {messages.length === 0 && (
                            <div className="flex items-center justify-center h-full text-sm text-slate-400">
                                아직 메시지가 없습니다
                            </div>
                        )}
                        {messages.map((msg, index) => {
                            const dateLabel = getDateLabel(msg, index)
                            const isMine = isMyMessage(msg)

                            return (
                                <div key={msg.id}>
                                    {/* 날짜 구분 */}
                                    {dateLabel && (
                                        <div className="flex items-center justify-center my-3">
                                            <span className="text-[10px] bg-slate-200 text-slate-500 px-3 py-1 rounded-full font-medium">
                                                {dateLabel}
                                            </span>
                                        </div>
                                    )}

                                    {/* 메시지 */}
                                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
                                        <div className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'}`}>
                                            {/* 이름 + 역할 */}
                                            {!isMine && (
                                                <div className="flex items-center gap-1.5 mb-1 ml-1">
                                                    <span className="text-xs font-bold text-slate-700">{msg.sender_name}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${ROLE_COLORS[msg.sender_role] || ROLE_COLORS.guest}`}>
                                                        {ROLE_LABELS[msg.sender_role] || '참여자'}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                                                <div className={`
                                                    px-3 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap
                                                    ${isMine
                                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                                        : 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-tl-sm'
                                                    }
                                                `}>
                                                    {msg.message}
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0 mb-0.5">
                                                    {formatTime(msg.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 입력 영역 */}
                    <div className="px-3 py-2.5 bg-white border-t border-slate-100">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="메시지를 입력하세요..."
                                className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!newMessage.trim() || isSending}
                                className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 p-0 shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="text-center mt-1.5">
                            <span className="text-[10px] text-slate-400">
                                {nickname} ({ROLE_LABELS[currentUserRole] || '참여자'})로 참여 중
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
