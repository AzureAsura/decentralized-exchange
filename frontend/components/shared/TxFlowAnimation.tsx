'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Send, XCircle } from 'lucide-react'

export type TxFlowStatus = 'sending' | 'success' | 'error'

interface TxFlowAnimationProps {
    status: TxFlowStatus
}

export const TxFlowAnimation: React.FC<TxFlowAnimationProps> = ({ status }) => (
    <div className="relative flex items-center justify-center h-20 w-20 mx-auto">
        <AnimatePresence mode="wait">
            {status === 'sending' && (
                <motion.div
                    key="sending"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, x: [0, 10, 0], y: [0, -8, 0] }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 },
                        x: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
                        y: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    className="text-blue-400"
                >
                    <Send className="w-10 h-10 -rotate-45" />
                </motion.div>
            )}
            {status === 'success' && (
                <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-emerald-400"
                >
                    <CheckCircle2 className="w-12 h-12" />
                </motion.div>
            )}
            {status === 'error' && (
                <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-red-400"
                >
                    <XCircle className="w-12 h-12" />
                </motion.div>
            )}
        </AnimatePresence>
    </div>
)
