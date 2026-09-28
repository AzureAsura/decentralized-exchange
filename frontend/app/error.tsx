'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Captured Error:', error)
  }, [error])

  return (
    <div className="relative min-h-[85vh] md:min-h-screen w-full bg-transparent text-white flex flex-col justify-center items-center px-4 pt-16 pb-6 sm:px-6 md:px-8 overflow-hidden select-none font-sans">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.15, 0.4, 0.15],
          scale: [0.9, 1.15, 0.9],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-rose-500/15 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-6 z-10 text-center">
        
        <div className="relative flex items-center justify-center">
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-rose-500/30"
          />

          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-rose-500/10 border border-rose-500/30"
          />

          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 220,
              damping: 18,
            }}
            className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#0B0E17] border border-rose-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.35)]"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <AlertOctagon className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 stroke-[1.75]" />
            </motion.div>
          </motion.div>
        </div>

        {/* 3. Text Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-2"
        >


          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-sm">
            Something Went Wrong
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            Something went wrong while loading data on Nirmala Protocol. Please refresh this page and try again.
          </p>

          {error?.message && (
            <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-400 font-mono max-w-xs mx-auto truncate">
              {error.message}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="card w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3"
        >
          <button
            onClick={() => reset()}
            className="btn-color w-full text-white font-semibold text-sm sm:text-base py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] tracking-tight flex items-center justify-center gap-2 shadow-lg group cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full text-gray-400 hover:text-white font-medium text-xs sm:text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-white/5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </motion.div>

      </div>
    </div>
  )
}