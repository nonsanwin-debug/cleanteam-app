import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createSite, updateSite } from '@/actions/sites'
import { toast } from 'sonner'
import { Loader2, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const formSchema = z.object({
    name: z.string().min(1, '현장명을 입력해주세요'),
    address: z.string().min(1, '주소를 입력해주세요'),
    worker_id: z.string().optional(),
    customer_name: z.string().optional(),
    customer_phone: z.string().optional(),
    residential_type: z.string().optional(),
    area_size: z.string().optional(),
    structure_type: z.string().optional(),
    cleaning_date: z.string().optional(),
    start_time: z.string().optional(),
    special_notes: z.string().optional(),
})

type Worker = {
    id: string
    name: string | null
}

interface SiteDialogProps {
    workers: Worker[]
    mode?: 'create' | 'update'
    siteId?: string
    initialData?: {
        name: string
        address: string
        worker_id?: string | null
        customer_name?: string
        customer_phone?: string
        residential_type?: string
        area_size?: string
        structure_type?: string
        cleaning_date?: string
        start_time?: string
        special_notes?: string
    }
    open?: boolean
    onOpenChange?: (open: boolean) => void
    triggerButton?: React.ReactNode
}

export function SiteDialog({
    workers,
    mode = 'create',
    siteId,
    initialData,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    triggerButton
}: SiteDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Custom Date Picker State
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

    // Custom Time Picker State
    const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM')
    const [hour, setHour] = useState<string>('')
    const [minute, setMinute] = useState<string>('00')

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = controlledOnOpenChange || setInternalOpen

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || '',
            address: initialData?.address || '',
            worker_id: initialData?.worker_id || 'unassigned',
            customer_name: initialData?.customer_name || '',
            customer_phone: initialData?.customer_phone || '',
            residential_type: initialData?.residential_type || '',
            area_size: initialData?.area_size || '',
            structure_type: initialData?.structure_type || '',
            cleaning_date: initialData?.cleaning_date || format(new Date(), 'yyyy-MM-dd'),
            start_time: initialData?.start_time || '',
            special_notes: initialData?.special_notes || '',
        },
    })

    // Initialize time picker state from form value
    useEffect(() => {
        if (open && initialData?.start_time) {
            const [h, m] = initialData.start_time.split(':')
            const hourNum = parseInt(h, 10)
            if (!isNaN(hourNum)) {
                setAmpm(hourNum >= 12 ? 'PM' : 'AM')
                const displayHour = hourNum % 12 || 12
                setHour(displayHour.toString())
                setMinute(m || '00')
            }
        }
    }, [open, initialData])

    // Update form time when picker state changes
    useEffect(() => {
        if (hour) {
            let hourNum = parseInt(hour, 10)
            if (ampm === 'PM' && hourNum !== 12) hourNum += 12
            if (ampm === 'AM' && hourNum === 12) hourNum = 0
            const timeString = `${hourNum.toString().padStart(2, '0')}:${minute}`
            form.setValue('start_time', timeString)
        }
    }, [ampm, hour, minute, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const data = {
                name: values.name,
                address: values.address,
                worker_id: values.worker_id === 'unassigned' ? undefined : values.worker_id,
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                residential_type: values.residential_type,
                area_size: values.area_size,
                structure_type: values.structure_type,
                cleaning_date: values.cleaning_date,
                start_time: values.start_time,
                special_notes: values.special_notes,
            }

            if (mode === 'update' && siteId) {
                await updateSite(siteId, data)
                toast.success('현장 정보가 수정되었습니다.')
            } else {
                await createSite(data)
                toast.success('현장이 등록되었습니다.')
            }
            setOpen(false)
            if (mode === 'create') {
                form.reset()
                // Reset custom states
                setHour('')
                setMinute('00')
                setAmpm('AM')
                setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
        } catch (error) {
            toast.error(mode === 'update' ? '수정 실패' : '등록 실패', {
                description: error instanceof Error ? error.message : `현장 ${mode === 'update' ? '수정' : '등록'} 중 오류가 발생했습니다.`
            })
        } finally {
            setIsLoading(false)
        }
    }

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {triggerButton ? (
                <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            ) : mode === 'create' ? (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> 현장 추가
                    </Button>
                </DialogTrigger>
            ) : null}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'update' ? '현장 정보 수정' : '새 현장 등록'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'update' ? '현장 정보를 수정합니다.' : '새로 관리할 청소 현장의 정보를 입력해주세요.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>현장명 (고객명)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="예: 강남 자이 101-1004" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Custom Date Picker */}
                            <FormField
                                control={form.control}
                                name="cleaning_date"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>청소 날짜</FormLabel>
                                        <div className="bg-slate-50 p-3 rounded-md border">
                                            <div className="flex justify-between items-center mb-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setCurrentWeekStart(prev => subWeeks(prev, 1))}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="font-medium text-sm">
                                                    {format(currentWeekStart, 'yyyy년 M월', { locale: ko })}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {weekDays.map(day => {
                                                    const isSelected = field.value === format(day, 'yyyy-MM-dd')
                                                    const isToday = isSameDay(day, new Date())
                                                    return (
                                                        <button
                                                            key={day.toISOString()}
                                                            type="button"
                                                            onClick={() => field.onChange(format(day, 'yyyy-MM-dd'))}
                                                            className={cn(
                                                                "flex flex-col items-center justify-center p-2 rounded-md transition-colors",
                                                                isSelected
                                                                    ? "bg-blue-600 text-white shadow-md scale-105"
                                                                    : "bg-white text-slate-700 hover:bg-slate-100 border border-transparent",
                                                                isToday && !isSelected && "border-blue-300 bg-blue-50"
                                                            )}
                                                        >
                                                            <span className="text-[10px] opacity-70 mb-1">{format(day, 'E', { locale: ko })}</span>
                                                            <span className={cn("text-lg font-bold", isSelected ? "text-white" : "text-slate-900")}>
                                                                {format(day, 'd')}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <div className="text-center mt-2">
                                                <span className="text-xs text-slate-500">
                                                    선택된 날짜: {field.value ? format(new Date(field.value), 'yyyy년 MM월 dd일 (E)', { locale: ko }) : '없음'}
                                                </span>
                                            </div>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Custom Time Picker */}
                            <FormField
                                control={form.control}
                                name="start_time"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>시작 시간</FormLabel>
                                        <div className="bg-slate-50 p-3 rounded-md border space-y-3">
                                            {/* AM/PM Toggle */}
                                            <div className="flex bg-slate-200 rounded-lg p-1 w-full relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setAmpm('AM')}
                                                    className={cn(
                                                        "flex-1 py-2 text-sm font-bold rounded-md transition-all z-10",
                                                        ampm === 'AM' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                                                    )}
                                                >
                                                    오전
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAmpm('PM')}
                                                    className={cn(
                                                        "flex-1 py-2 text-sm font-bold rounded-md transition-all z-10",
                                                        ampm === 'PM' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                                                    )}
                                                >
                                                    오후
                                                </button>
                                            </div>

                                            {/* Hour Grid (1-12) */}
                                            <div className="grid grid-cols-6 gap-2">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                                                    <button
                                                        key={h}
                                                        type="button"
                                                        onClick={() => setHour(h.toString())}
                                                        className={cn(
                                                            "py-2 rounded-md font-bold text-lg border transition-all",
                                                            hour === h.toString()
                                                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                                : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                                                        )}
                                                    >
                                                        {h}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Minute Selection */}
                                            <div className="flex gap-2">
                                                {['00', '30'].map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setMinute(m)}
                                                        className={cn(
                                                            "flex-1 py-2 rounded-md font-medium text-sm border transition-all",
                                                            minute === m
                                                                ? "bg-slate-800 text-white border-slate-800"
                                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        {m}분
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="text-center border-t pt-2 mt-2">
                                                <span className="text-sm font-bold text-blue-600">
                                                    설정 시간: {ampm} {hour ? hour : '--'}:{minute}
                                                </span>
                                            </div>

                                            {/* Hidden input to ensure form validation works if needed, though redundant with controlled component */}
                                            <input type="hidden" {...field} />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>주소</FormLabel>
                                        <FormControl>
                                            <Input placeholder="상세 주소를 입력하세요" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="customer_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>고객 성함</FormLabel>
                                        <FormControl>
                                            <Input placeholder="홍길동" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="customer_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>고객 연락처</FormLabel>
                                        <FormControl>
                                            <Input placeholder="010-1234-5678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="residential_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>주거 형태</FormLabel>
                                        <FormControl>
                                            <Input placeholder="아파트, 빌라 등" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="area_size"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>평수</FormLabel>
                                        <FormControl>
                                            <Input placeholder="24평" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="structure_type"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>구조</FormLabel>
                                        <FormControl>
                                            <Input placeholder="방3, 화장실2, 베란다 확장 등" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="special_notes"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>특이사항</FormLabel>
                                        <FormControl>
                                            <Input placeholder="고객 요청사항 등" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="worker_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>담당 팀장 (선택)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="담당자를 선택하세요" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="unassigned">미지정</SelectItem>
                                            {workers.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    조회된 팀장이 없습니다 (권한 확인 필요)
                                                </SelectItem>
                                            ) : (
                                                workers.map((worker) => (
                                                    <SelectItem key={worker.id} value={worker.id}>
                                                        {worker.name || '이름 없음'}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading || !form.getValues('cleaning_date') || !form.getValues('start_time')}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (mode === 'update' ? '수정' : '저장')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
