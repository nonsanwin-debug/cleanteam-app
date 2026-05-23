'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Send, UserPlus, Copy, Check, MessageCircle, ChevronDown } from 'lucide-react'
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
    currentUserRole?: 'leader' | 'customer' | 'guest'
    currentUserId?: string
}

const ROLE_LABELS: Record<string, string> = {
    leader: '청소팀',
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

export function SiteChat({ siteId, currentUserName, currentUserRole = 'guest', currentUserId }: SiteChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    
    // 닉네임 입력 (고객/게스트용)
    const [nickname, setNickname] = useState(currentUserName || '')
    const [hasSetNickname, setHasSetNickname] = useState(!!currentUserName)
    
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    
    const [unreadCount, setUnreadCount] = useState(0)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        <div className="mt-6">
            {/* 채팅 열기/닫기 버튼 */}
            <button
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) setUnreadCount(0) }}
                className={`
                    w-full flex items-center justify-between p-4 rounded-xl border transition-all
                    ${isOpen
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 shadow-sm'
                    }
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOpen ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <span className="font-bold text-slate-800 text-sm">💬 현장 채팅</span>
                        <p className="text-xs text-slate-500">팀장 · 고객 · 관계자 실시간 소통</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && !isOpen && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* 채팅 영역 */}
            {isOpen && (
                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* 상단 바 */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500">
                            {messages.length > 0 ? `${messages.length}개 메시지` : '대화를 시작해보세요'}
                        </span>
                        <div className="flex gap-1.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-600 hover:text-blue-600"
                                onClick={handleCopyInviteLink}
                            >
                                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                링크 복사
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-600 hover:text-blue-600"
                                onClick={handleSmsInvite}
                            >
                                <UserPlus className="w-3.5 h-3.5 mr-1" />
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
            )}
        </div>
    )
}
