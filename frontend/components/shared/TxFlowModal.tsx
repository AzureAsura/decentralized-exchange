'use client'

import React from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer'

const BASE_CONTENT_CLASSNAME =
    'card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white max-w-[28vw] rounded-[1.8vw] p-[1.5vw] shadow-2xl'

interface TxFlowModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    locked: boolean
    title: string
    minWidthClassName?: string
    children: React.ReactNode
}

export const TxFlowModal: React.FC<TxFlowModalProps> = ({
    open,
    onOpenChange,
    locked,
    title,
    minWidthClassName = 'min-w-[360px]',
    children,
}) => {
    const isDesktop = useMediaQuery('(min-width: 768px)')

    const handleOpenChange = (next: boolean) => {
        if (locked) return
        onOpenChange(next)
    }

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent showCloseButton={!locked} className={`${BASE_CONTENT_CLASSNAME} ${minWidthClassName}`}>
                    <DialogHeader className="pb-1">
                        <DialogTitle className="text-lg font-semibold text-white tracking-tight">{title}</DialogTitle>
                    </DialogHeader>
                    {children}
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="card border-none bg-[#0B0E17]/95 backdrop-blur-2xl text-white rounded-t-[28px] px-5 pb-8 pt-3">
                <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
                <DrawerHeader className="p-0 pb-2 text-left">
                    <DrawerTitle className="text-xl font-semibold text-white">{title}</DrawerTitle>
                </DrawerHeader>
                {children}
            </DrawerContent>
        </Drawer>
    )
}
