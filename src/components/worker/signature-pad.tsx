'use client'

import React, { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

interface SignaturePadProps {
    onEnd: (dataUrl: string | null) => void
}

export function SignaturePad({ onEnd }: SignaturePadProps) {
    const sigCanvas = useRef<SignatureCanvas>(null)
    const [isEmpty, setIsEmpty] = useState(true)

    const clear = () => {
        sigCanvas.current?.clear()
        setIsEmpty(true)
        onEnd(null)
    }

    // Optimized ref callback to set willReadFrequently as early as possible
    const setCanvasRef = (ref: SignatureCanvas | null) => {
        sigCanvas.current = ref
        if (ref) {
            const canvas = ref.getCanvas()
            if (canvas) {
                // Force context creation with option
                canvas.getContext('2d', { willReadFrequently: true })
            }
        }
    }

    const handleEnd = () => {
        if (sigCanvas.current) {
            if (sigCanvas.current.isEmpty()) {
                setIsEmpty(true)
                onEnd(null)
            } else {
                setIsEmpty(false)
                // Extract data URL (PNG)
                // Trimmed canvas
                const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
                onEnd(dataUrl)
            }
        }
    }

    return (
        <div className="border rounded-md bg-white p-2">
            <div className="border border-slate-200 rounded bg-slate-50 h-40 relative">
                <SignatureCanvas
                    ref={setCanvasRef}
                    penColor="black"
                    canvasProps={{
                        className: 'w-full h-full cursor-crosshair',
                        style: { touchAction: 'none' }
                    }}
                    onEnd={handleEnd}
                />
                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300">
                        이곳에 서명해주세요
                    </div>
                )}
            </div>
            <div className="mt-2 text-right">
                <Button size="sm" variant="ghost" type="button" onClick={clear}>
                    <Eraser className="w-4 h-4 mr-1" />
                    지우기
                </Button>
            </div>
        </div>
    )
}
