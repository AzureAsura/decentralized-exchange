'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Compass, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="relative min-h-[85vh] md:min-h-screen w-full bg-transparent text-white flex flex-col justify-center items-center px-4 pt-16 pb-6 sm:px-6 md:px-8 overflow-hidden select-none font-sans">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.2, 0.5, 0.2],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-6 z-10 text-center">
        
        <div className="relative flex items-center justify-center">
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-blue-500/30"
          />

          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-blue-500/10 border border-blue-500/30"
          />

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#0B0E17] border border-blue-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.35)]"
          >
            <motion.div
              animate={{ rotate: [0, 45, -45, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Compass className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 stroke-[1.75]" />
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-2"
        >


          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-sm">
            Page Not Found
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xs sm:max-w-sm mx-auto leading-relaxed">
           This page could not be found or may have been moved.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="card w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3"
        >
          <Link
            href="/"
            className="btn-color w-full text-white font-semibold text-sm sm:text-base py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] tracking-tight flex items-center justify-center gap-2 shadow-lg group"
          >
            <Home className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Back to Home</span>
          </Link>

          <Link
            href="/trade"
            className="w-full text-gray-400 hover:text-white font-medium text-xs sm:text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 hover:bg-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Swap App</span>
          </Link>
        </motion.div>

      </div>
    </div>
  )
}